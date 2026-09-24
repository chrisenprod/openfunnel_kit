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
