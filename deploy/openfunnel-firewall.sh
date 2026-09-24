#!/bin/sh
set -eu

# Only this application's bridge/port are affected; never flush shared chains.
rule() {
    fw_tool=$1; fw_table=$2; fw_chain=$3; shift 3
    if [ "${1:-}" = "" ]; then exit 1; fi
    if [ "$action" = apply ]; then
        "$fw_tool" -w 5 -t "$fw_table" -C "$fw_chain" "$@" 2>/dev/null ||
            "$fw_tool" -w 5 -t "$fw_table" -I "$fw_chain" "$@"
    else
        while "$fw_tool" -w 5 -t "$fw_table" -C "$fw_chain" "$@" 2>/dev/null; do
            "$fw_tool" -w 5 -t "$fw_table" -D "$fw_chain" "$@"
        done
    fi
}

action=${1:-apply}
case "$action" in apply|remove) ;; *) exit 2 ;; esac
if [ "$action" = remove ] && [ -n "$(docker ps --filter network=openfunnel -q)" ]; then
    echo 'Stop OpenFunnel containers before removing isolation.' >&2
    exit 1
fi
if [ "$action" = apply ]; then
    iptables -w 5 -nL DOCKER-USER >/dev/null 2>&1 || iptables -w 5 -N DOCKER-USER
    # Docker normally creates this jump; also cover the early boot ordering.
    iptables -w 5 -C FORWARD -j DOCKER-USER 2>/dev/null || iptables -w 5 -I FORWARD -j DOCKER-USER
fi
rule iptables filter DOCKER-USER ! -i br-openfunnel -o br-openfunnel \
    -m conntrack ! --ctstate ESTABLISHED,RELATED -m comment --comment openfunnel-isolation -j DROP
rule iptables filter INPUT ! -i lo -p tcp --dport 8180 \
    -m comment --comment openfunnel-isolation -j DROP
rule iptables raw PREROUTING ! -i lo -d 127.0.0.1 -p tcp --dport 8180 \
    -m comment --comment openfunnel-isolation -j DROP
rule ip6tables filter INPUT ! -i lo -p tcp --dport 8180 \
    -m comment --comment openfunnel-isolation -j DROP
rule ip6tables raw PREROUTING ! -i lo -d ::1 -p tcp --dport 8180 \
    -m comment --comment openfunnel-isolation -j DROP
