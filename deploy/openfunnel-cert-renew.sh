#!/bin/sh
set -eu
case " ${RENEWED_DOMAINS:-} " in
    *" app.openfunnel.mocca.cl "*) nginx -t && systemctl reload nginx ;;
esac
