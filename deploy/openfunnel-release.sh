#!/bin/bash
set -euo pipefail
umask 077
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export GIT_TERMINAL_PROMPT=0
[[ $EUID -eq 0 && $# -eq 2 && $1 =~ ^[0-9a-f]{40}$ && $2 =~ ^[0-9]{1,20}$ ]] || exit 64
release_sha=$1
ci_run=$2
base=/srv/openfunnel-app
repository=$base/repository.git
release=$base/releases/$release_sha
exec 9>/run/lock/openfunnel-deploy.lock
flock -n 9 || { printf 'Another deployment is active.\n' >&2; exit 75; }

# Trust GitHub's public API, not values provided by the SSH client alone.
run_json=$(mktemp)
trap 'rm -f "$run_json"' EXIT
timeout 45 curl --fail --silent --show-error --max-time 30 \
  -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/chrisenprod/openfunnel_kit/actions/runs/$ci_run" > "$run_json"
python3 - "$run_json" "$release_sha" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    run = json.load(source)
valid = (
    run.get('repository', {}).get('full_name') == 'chrisenprod/openfunnel_kit'
    and run.get('head_repository', {}).get('full_name') == 'chrisenprod/openfunnel_kit'
    and run.get('head_sha') == sys.argv[2]
    and run.get('head_branch') == 'main'
    and run.get('path') == '.github/workflows/ci.yml'
    and run.get('event') in ('push', 'workflow_dispatch')
    and run.get('status') == 'completed'
    and run.get('conclusion') == 'success'
)
if not valid:
    sys.exit('Denied: CI provenance or result does not match.')
PY
rm -f "$run_json"
trap - EXIT

# The remote and branch are fixed; no archives or commands are accepted from CI.
if [[ ! -d $repository ]]; then git init --bare "$repository" >/dev/null; fi
timeout 120 git --git-dir="$repository" fetch --quiet --no-tags \
  https://github.com/chrisenprod/openfunnel_kit.git +refs/heads/main:refs/heads/main
[[ $(git --git-dir="$repository" rev-parse refs/heads/main) == "$release_sha" ]] || {
  printf 'Denied: commit is no longer the head of main.\n' >&2; exit 65;
}
previous=$(readlink -f "$base/current")
[[ $previous == "$base/releases/"* && -f $previous/RELEASE ]] || exit 66
previous_sha=$(cat "$previous/RELEASE")
[[ $previous_sha =~ ^[0-9a-f]{40}$ ]] || exit 66

# Existing releases are immutable. Failed preparation uses a private temporary tree.
if [[ ! -d $release ]]; then
  staging=$(mktemp -d "$base/releases/.prepare-XXXXXXXX")
  trap 'rm -rf "$staging"' EXIT
  git --git-dir="$repository" archive "$release_sha" | tar -x -C "$staging"
  printf '%s\n' "$release_sha" > "$staging/RELEASE"
  mv "$staging" "$release"
  trap - EXIT
fi
[[ $(cat "$release/RELEASE") == "$release_sha" ]] || exit 66
# Conservatively require manual review for any migration or migration-runner change.
if ! diff -qr "$previous/backend/migrations" "$release/backend/migrations" >/dev/null || \
   ! cmp -s "$previous/backend/migrate.js" "$release/backend/migrate.js"; then
  printf 'Manual deployment required: database migration files changed.\n' >&2
  exit 67
fi

compose() {
  local folder=$1
  shift
  OPENFUNNEL_RELEASE=$(cat "$folder/RELEASE") timeout 600 docker compose \
    --project-directory "$folder" --env-file /etc/openfunnel/app.env \
    -f "$folder/compose.yaml" -f "$folder/compose.production.yaml" -p openfunnel "$@"
}
health() {
  local endpoint
  for endpoint in http://127.0.0.1:8180/api/health https://app.openfunnel.mocca.cl/api/health; do
    curl --fail --silent --show-error --max-time 15 "$endpoint" |
      python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("ok") is True else 1)' || return 1
  done
  curl --fail --silent --show-error --max-time 15 -o /dev/null https://app.openfunnel.mocca.cl/ || return 1
}
activate() {
  rm -f "$base/.current-next"
  ln -s "$1" "$base/.current-next"
  mv -Tf "$base/.current-next" "$base/current"
}

if [[ $previous_sha == "$release_sha" ]]; then
  health
  printf 'Release already active and healthy: %s\n' "$release_sha"
  exit 0
fi
compose "$release" config --quiet
# Bound build time. Provider secrets are runtime-only, never build arguments.
compose "$release" build
# Wait for the verified snapshot before changing any running containers.
timeout 330 systemctl start openfunnel-backup.service
[[ $(systemctl show openfunnel-backup.service -p Result --value) == success ]] || exit 68
# Recheck main after the build: queued older commits must not replace newer code.
timeout 60 git --git-dir="$repository" fetch --quiet --no-tags \
  https://github.com/chrisenprod/openfunnel_kit.git +refs/heads/main:refs/heads/main
[[ $(git --git-dir="$repository" rev-parse refs/heads/main) == "$release_sha" ]] || exit 65

switched=0
recover() {
  local result=$?
  trap - EXIT TERM INT
  if [[ $switched -eq 1 && $result -ne 0 ]]; then
    printf 'Deployment failed; recovering previous release %s.\n' "$previous_sha" >&2
    # Never restore an old database: it could erase newly received messages.
    if activate "$previous" && compose "$previous" up -d --no-build --wait --wait-timeout 120 && health; then
      printf 'Previous code restored; existing data preserved.\n' >&2
    else
      printf 'RECOVERY FAILED: operator intervention required.\n' >&2
    fi
  fi
  exit "$result"
}
trap recover EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
switched=1
activate "$release"
# Reuse the same project/service/volume; Compose replaces the single API instance.
compose "$release" up -d --no-build --wait --wait-timeout 120
health
switched=0
printf 'Deployed and healthy: %s\n' "$release_sha"
