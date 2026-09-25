#!/bin/sh
set -eu
umask 077
exec 9>/run/lock/openfunnel-backup.lock
flock -n 9 || exit 0
cd /srv/openfunnel-app/current
OPENFUNNEL_RELEASE=$(cat RELEASE)
export OPENFUNNEL_RELEASE
dc() { docker compose --env-file /etc/openfunnel/app.env -f compose.yaml -f compose.production.yaml -p openfunnel "$@"; }
mkdir -p /var/backups/openfunnel
chmod 700 /var/backups/openfunnel
# Cloud needs a consistent copy of control and every workspace, not one database.
app_mode=$(dc exec -T api node -e 'process.stdout.write(process.env.APP_MODE || "self-hosted")')
if [ "$app_mode" = cloud ]; then
  backup_name=openfunnel-cloud-$(date -u +%Y%m%dT%H%M%SZ).tar.gz
  snapshot_dir=$(mktemp -d /var/backups/openfunnel/.cloud-XXXXXXXX)
  stopped=0
  recover_cloud() {
    result=$?
    trap - EXIT HUP INT TERM
    if [ "$stopped" = 1 ]; then
      dc start api || { printf 'Backup recovery failed: restart the API manually.\n' >&2; result=1; }
    fi
    rm -rf "$snapshot_dir"
    exit "$result"
  }
  trap recover_cloud EXIT
  trap 'exit 1' HUP INT TERM
  container_id=$(dc ps -q api)
  image_id=$(docker inspect --format '{{.Image}}' "$container_id")
  stopped=1
  dc stop api
  docker cp "$container_id:/app/data/." "$snapshot_dir/"
  dc start api
  stopped=0
  # Verify the isolated copy, with no network or production environment.
  docker run --rm -i --network none --read-only --user 0:0 \
    --cap-drop ALL --security-opt no-new-privileges:true \
    --mount "type=bind,src=$snapshot_dir,dst=/snapshot" \
    --entrypoint node "$image_id" --input-type=module - <<'JS'
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
if (!existsSync('/snapshot/cloud/control.sqlite')) throw new Error('Cloud control database missing');
let count = 0;
function verify(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) verify(path);
    else if (entry.isFile() && entry.name.endsWith('.sqlite')) {
      const db = new DatabaseSync(path);
      try {
        if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Backup integrity failed');
        if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup references failed');
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        count++;
      } finally { db.close(); }
    }
  }
}
verify('/snapshot');
console.log(`Verified cloud backup databases: ${count}`);
JS
  tar -czf "/var/backups/openfunnel/$backup_name.tmp" -C "$snapshot_dir" .
  chmod 600 "/var/backups/openfunnel/$backup_name.tmp"
  mv "/var/backups/openfunnel/$backup_name.tmp" "/var/backups/openfunnel/$backup_name"
  find /var/backups/openfunnel -maxdepth 1 -type f -name 'openfunnel-cloud-*.tar.gz' -mtime +7 -delete
  printf 'Verified backup created: %s\n' "$backup_name"
  exit 0
fi
backup_name=openfunnel-$(date -u +%Y%m%dT%H%M%SZ).sqlite
snapshot=/app/data/.$backup_name
trap 'dc exec -T api node -e '\''require("fs").rmSync(process.argv[1],{force:true})'\'' "$snapshot" >/dev/null 2>&1 || true' EXIT
dc exec -T api node --input-type=module - "$snapshot" <<'JS'
import { DatabaseSync, backup } from 'node:sqlite';
process.umask(0o077);
const source = new DatabaseSync('/app/data/app.sqlite', { readOnly: true });
await backup(source, process.argv[2]);
source.close();
const copy = new DatabaseSync(process.argv[2], { readOnly: true });
if (copy.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Backup integrity failed');
if (copy.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup references failed');
copy.close();
JS
container_id=$(dc ps -q api)
docker cp "$container_id:$snapshot" "/var/backups/openfunnel/$backup_name.tmp"
chmod 600 "/var/backups/openfunnel/$backup_name.tmp"
mv "/var/backups/openfunnel/$backup_name.tmp" "/var/backups/openfunnel/$backup_name"
find /var/backups/openfunnel -maxdepth 1 -type f -name 'openfunnel-*.sqlite' -mtime +7 -delete
printf 'Verified backup created: %s\n' "$backup_name"
