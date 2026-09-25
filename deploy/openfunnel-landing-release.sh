#!/bin/bash
set -euo pipefail
umask 077
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export GIT_TERMINAL_PROMPT=0
[[ $EUID -eq 0 && $# -eq 2 && $1 =~ ^[0-9a-f]{40}$ && $2 =~ ^[0-9]{1,20}$ ]] || exit 64
release_sha=$1
ci_run=$2
# Only root may configure the trusted repository and publication destination.
config=/etc/openfunnel/landing-deploy.env
[[ -f $config && $(stat -c %u "$config") == 0 && -z $(find "$config" -perm /022 -print) ]] || exit 64
# shellcheck source=landing-deploy.env.example
. "$config"
: "${DEPLOY_REPOSITORY:?}" "${DEPLOY_BRANCH:?}" "${LANDING_ORIGIN:?}" "${LANDING_ROOT:?}" "${LANDING_STATE_ROOT:?}" "${LANDING_NODE_IMAGE:?}"
[[ $DEPLOY_REPOSITORY =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ && $DEPLOY_BRANCH =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || exit 64
[[ $LANDING_ROOT == /* && $LANDING_ROOT != / && $LANDING_STATE_ROOT == /* && $LANDING_STATE_ROOT != / ]] || exit 64
[[ $LANDING_NODE_IMAGE =~ @sha256:[0-9a-f]{64}$ ]] || exit 64
python3 - "$LANDING_ORIGIN" <<'PY'
import sys, urllib.parse
u = urllib.parse.urlsplit(sys.argv[1])
if u.scheme != 'https' or not u.hostname or u.username or u.password or u.path not in ('', '/') or u.query or u.fragment:
    sys.exit('Invalid landing origin.')
PY
exec 9>/run/lock/openfunnel-deploy.lock
flock -n 9 || { printf 'Another deployment is active.\n' >&2; exit 75; }
mkdir -p "$LANDING_STATE_ROOT" "$LANDING_ROOT/releases"
chmod 700 "$LANDING_STATE_ROOT"
repository=$LANDING_STATE_ROOT/repository.git
release=$LANDING_ROOT/releases/$release_sha
previous=$(readlink -f "$LANDING_ROOT/current")
[[ $previous == "$LANDING_ROOT/releases/"* && -s $previous/index.html ]] || exit 66
work=$(mktemp -d "$LANDING_STATE_ROOT/.build-XXXXXXXX")
container=openfunnel-landing-build
switched=0
activate() {
  rm -f "$LANDING_ROOT/.current-next" || return
  ln -s "$1" "$LANDING_ROOT/.current-next" || return
  mv -Tf "$LANDING_ROOT/.current-next" "$LANDING_ROOT/current"
}
health() {
  curl --fail --silent --show-error --max-time 20 -H 'Cache-Control: no-cache' \
    "${LANDING_ORIGIN%/}/" -o "$work/served.html" || return 1
  cmp -s "$1/index.html" "$work/served.html"
}
cleanup() {
  local result=$?
  trap - EXIT TERM INT
  # Only the dedicated temporary builder is removed, never app containers or volumes.
  docker rm -f "$container" >/dev/null 2>&1 || true
  if [[ $switched -eq 1 && $result -ne 0 ]]; then
    if activate "$previous" && health "$previous"; then
      printf 'Previous landing restored.\n' >&2
    else
      printf 'LANDING RECOVERY FAILED: operator intervention required.\n' >&2
    fi
  fi
  if [[ -n ${staging:-} && -d $staging ]]; then rm -rf "$staging"; fi
  rm -rf "$work"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

# The server independently verifies CI; the runner cannot choose a different repo.
curl --fail --silent --show-error --max-time 30 -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/$DEPLOY_REPOSITORY/actions/runs/$ci_run" > "$work/run.json"
python3 - "$work/run.json" "$release_sha" "$DEPLOY_REPOSITORY" "$DEPLOY_BRANCH" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    run = json.load(source)
if not (
    run.get('repository', {}).get('full_name') == sys.argv[3]
    and run.get('head_repository', {}).get('full_name') == sys.argv[3]
    and run.get('head_sha') == sys.argv[2] and run.get('head_branch') == sys.argv[4]
    and run.get('path') == '.github/workflows/ci.yml'
    and run.get('event') in ('push', 'workflow_dispatch')
    and run.get('status') == 'completed' and run.get('conclusion') == 'success'
):
    sys.exit('Denied: CI provenance or result does not match.')
PY
if [[ ! -d $repository ]]; then git init --bare "$repository" >/dev/null; fi
current_head() {
  timeout 120 git --git-dir="$repository" fetch --quiet --no-tags \
    "https://github.com/$DEPLOY_REPOSITORY.git" "+refs/heads/$DEPLOY_BRANCH:refs/heads/$DEPLOY_BRANCH" || return
  [[ $(git --git-dir="$repository" rev-parse "refs/heads/$DEPLOY_BRANCH") == "$release_sha" ]]
}
current_head || { printf 'Denied: commit is no longer the branch head.\n' >&2; exit 65; }
if [[ -f $LANDING_STATE_ROOT/deployed-sha ]]; then
  deployed_sha=$(cat "$LANDING_STATE_ROOT/deployed-sha")
  [[ $deployed_sha =~ ^[0-9a-f]{40}$ ]] || exit 66
  if git --git-dir="$repository" diff --quiet "$deployed_sha" "$release_sha" -- \
    landing package.json package-lock.json .nvmrc scripts/build-docs.js docs/site docs/api/AGENTES.md \
    deploy/openfunnel-landing-release.sh; then
    health "$previous"
    printf 'Landing inputs unchanged; existing release kept.\n'
    exit 0
  else
    diff_status=$?
    [[ $diff_status -eq 1 ]] || exit "$diff_status"
  fi
fi

# Build only public committed source, without the app environment or production DB.
mkdir "$work/source"
git --git-dir="$repository" archive "$release_sha" | tar -x -C "$work/source"
chown -R 1000:1000 "$work/source"
timeout 600 docker run --rm --name "$container" --user 1000:1000 \
  --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --memory "${LANDING_BUILD_MEMORY:-1g}" --cpus "${LANDING_BUILD_CPUS:-1}" --pids-limit 256 \
  --tmpfs /tmp:rw,noexec,nosuid,size=256m \
  -e npm_config_cache=/tmp/npm --mount "type=bind,src=$work/source,dst=/workspace" \
  -w /workspace "$LANDING_NODE_IMAGE" sh -c 'npm ci && npm run build:landing'
output=$work/source/dist/landing
[[ -s $output/index.html && -z $(find "$output" ! -type f ! -type d -print) && -z $(find "$output" -name ".*" -print) ]] || {
  printf 'Invalid static output.\n' >&2; exit 67;
}
# Prepare public files separately; neither sources nor deployment metadata are served.
if [[ -d $release ]]; then
  # A retry after failed health may reuse an identical, already prepared release.
  [[ -z $(find "$release" ! -type f ! -type d -print) ]] || exit 67
  while IFS= read -r -d '' file; do
    cmp -s "$file" "$release/${file#"$output/"}" || exit 66
  done < <(find "$output" -type f -print0)
else
  staging=$LANDING_ROOT/releases/.prepare-$release_sha
  mkdir "$staging"
  if [[ -d $previous/assets ]]; then cp -a "$previous/assets" "$staging/"; fi
  cp -a "$output/." "$staging/"
  [[ -z $(find "$staging" ! -type f ! -type d -print) ]] || exit 67
  chown -R root:root "$staging"
  find "$staging" -type d -exec chmod 755 {} +
  find "$staging" -type f -exec chmod 644 {} +
  mv "$staging" "$release"
fi
current_head || { printf 'Denied: branch advanced during build.\n' >&2; exit 65; }
switched=1
activate "$release"
health "$release"
printf '%s\n' "$release_sha" > "$LANDING_STATE_ROOT/deployed-sha.next"
mv "$LANDING_STATE_ROOT/deployed-sha.next" "$LANDING_STATE_ROOT/deployed-sha"
switched=0
printf 'Landing deployed and healthy: %s\n' "$release_sha"
