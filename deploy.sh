#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

fail() {
  printf 'deploy.sh: %s\n' "$*" >&2
  exit 1
}

for command in docker python3 lsof; do
  command -v "$command" >/dev/null 2>&1 || fail "Required command not found: $command"
done
docker compose version >/dev/null

if [[ -n "${DOCKER_CONTEXT:-}" || -z "${DOCKER_HOST:-}" ]]; then
  endpoint=$(docker context inspect --format '{{.Endpoints.docker.Host}}')
else
  endpoint=$DOCKER_HOST
fi
case "$endpoint" in
  unix://*) ;;
  *) fail "A local Docker context (unix socket) is required to clean up host ports." ;;
esac

# Let Compose resolve .env, environment overrides, and Compose override files.
ports=$(docker compose config --format json | python3 -c '
import json, sys
ports = set()
for service in json.load(sys.stdin)["services"].values():
    for mapping in service.get("ports", []):
        published = mapping.get("published")
        if published is None:
            continue
        protocol = mapping.get("protocol", "tcp")
        if protocol != "tcp":
            sys.exit("deploy.sh supports TCP port cleanup only; found " + protocol)
        bounds = str(published).split("-")
        first, last = int(bounds[0]), int(bounds[-1])
        if len(bounds) > 2 or not 0 <= first <= last <= 65535:
            sys.exit("Invalid published port: " + str(published))
        ports.update((port, protocol) for port in range(max(1, first), last + 1))
for port, protocol in sorted(ports):
    print(f"{port}/{protocol}")
')

# Inspect actual host bindings: Docker's publish filter can match container ports.
# Stop containers through Docker so restart policies do not respawn port owners.
running=$(docker ps -q)
conflicts=""
if [[ -n "$running" && -n "$ports" ]]; then
  running_ids=()
  while IFS= read -r id; do running_ids+=("$id"); done <<< "$running"
  conflicts=$(docker inspect "${running_ids[@]}" | python3 -c '
import json, sys
wanted = set(sys.argv[1].splitlines())
for container in json.load(sys.stdin):
    bindings = container.get("NetworkSettings", {}).get("Ports") or {}
    if any(binding["HostPort"] + "/" + target.rsplit("/", 1)[-1] in wanted
           for target, entries in bindings.items() for binding in (entries or [])):
        print(container["Id"])
' "$ports")
fi

as_root() {
  if [[ "$EUID" -eq 0 ]]; then
    "$@"
  else
    command -v sudo >/dev/null 2>&1 || fail "sudo is required to inspect or stop another user's port listener."
    sudo -- "$@"
  fi
}

if [[ -n "$conflicts" ]]; then
  while IFS= read -r id; do
    printf 'Stopping container %s to release a required port...\n' "$id"
    docker stop -t 10 "$id"
  done <<< "$conflicts"
fi

port_available() {
  python3 - "$1" <<'PY'
import errno
import socket
import sys

for family, address in ((socket.AF_INET, "0.0.0.0"), (socket.AF_INET6, "::")):
    try:
        with socket.socket(family, socket.SOCK_STREAM) as listener:
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if family == socket.AF_INET6:
                listener.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            listener.bind((address, int(sys.argv[1])))
    except OSError as error:
        if family == socket.AF_INET6 and error.errno in (
            errno.EAFNOSUPPORT, errno.EPROTONOSUPPORT, errno.EADDRNOTAVAIL
        ):
            continue
        sys.exit(1)
PY
}

listeners() {
  local port=$1 protocol=$2 result status
  local args=(-nP -t "-iTCP:${port}" -sTCP:LISTEN)
  if result=$(lsof "${args[@]}" 2>&1); then
    :
  else
    status=$?
    # lsof returns 1 with no output when no matching sockets exist.
    [[ "$status" -eq 1 && -z "$result" ]] || fail "Unable to inspect $port/$protocol: $result"
  fi
  # lsof may hide other users' processes. Probe binding before declaring it free.
  if [[ -z "$result" ]] && ! port_available "$port"; then
    result=$(as_root lsof "${args[@]}") || fail "Cannot bind $port/$protocol or identify its owner."
    [[ -n "$result" ]] || fail "$port/$protocol is unavailable, but no listener was found."
  fi
  printf '%s\n' "$result"
}

if [[ -n "$ports" ]]; then
  while IFS=/ read -r port protocol; do
    pids=$(listeners "$port" "$protocol")
    if [[ -n "$pids" ]]; then
      while IFS= read -r pid; do
        # A shared Docker backend must be managed through Docker, never killed.
        name=$(ps -p "$pid" -o comm= || true)
        case "$name" in
          *docker*|*Docker*|*containerd*|*rootlesskit*|*vpnkit*)
            fail "$port/$protocol is still held by Docker ($name, PID $pid). Stop the owning container or Docker context first." ;;
        esac
        printf 'Releasing %s/%s: sending TERM to PID %s (%s)...\n' "$port" "$protocol" "$pid" "$name"
        kill -TERM "$pid" 2>/dev/null || as_root kill -TERM "$pid" || true
      done <<< "$pids"
      for ((attempt = 0; attempt < 10; attempt++)); do
        remaining=$(listeners "$port" "$protocol")
        [[ -n "$remaining" ]] || break
        sleep 1
      done
      # Only escalate for original listeners still holding this port.
      remaining=$(listeners "$port" "$protocol")
      while IFS= read -r pid; do
        if [[ -n "$pid" ]] && [[ $'\n'"$remaining"$'\n' == *$'\n'"$pid"$'\n'* ]]; then
          printf 'Sending KILL to PID %s on %s/%s...\n' "$pid" "$port" "$protocol"
          kill -KILL "$pid" 2>/dev/null || as_root kill -KILL "$pid" || true
        fi
      done <<< "$pids"
      sleep 1
    fi
    remaining=$(listeners "$port" "$protocol")
    [[ -z "$remaining" ]] || fail "$port/$protocol is still occupied; a process may be restarting automatically."
  done <<< "$ports"
fi

printf 'Required ports are free. Starting Docker Compose...\n'
exec docker compose up --build "$@"
