#!/bin/bash
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
# This is the only sudo command granted to the dedicated deployment account.
[[ $EUID -eq 0 && ($# -eq 2 || $# -eq 3) && $1 =~ ^[0-9a-f]{40}$ && $2 =~ ^[0-9]{1,20}$ ]] || exit 64
target=${3:-app}
case "$target" in
  app) worker=/usr/local/libexec/openfunnel-release ;;
  landing) worker=/usr/local/libexec/openfunnel-landing-release ;;
  *) exit 64 ;;
esac
# systemd owns the worker so an SSH disconnect cannot leave a half-run shell job.
# The worker also takes a host lock; the unique unit rejects duplicate active requests.
result=0
/usr/bin/systemd-run --quiet --wait --collect \
  --unit="openfunnel-deploy-$target-$1" --service-type=oneshot \
  --property=TimeoutStartSec=25min --property=TimeoutStopSec=4min \
  "$worker" "$1" "$2" || result=$?
# Journal output stays on the server if the SSH connection disappears.
/usr/bin/journalctl --no-pager -u "openfunnel-deploy-$target-$1" -n 80 -o cat
exit "$result"
