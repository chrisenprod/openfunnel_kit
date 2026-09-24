#!/bin/bash
set -euo pipefail
# Installed root-owned. authorized_keys forces this command and disables forwarding.
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})\ ([0-9]{1,20})$ ]]; then
  exec /usr/bin/sudo -n /usr/local/sbin/openfunnel-deploy "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi
printf 'Denied: only a verified deployment request is allowed.\n' >&2
exit 64
