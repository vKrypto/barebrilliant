#!/usr/bin/env bash
set -euo pipefail

readonly STOP_TIMEOUT_SECONDS=10

fail() {
  printf 'deploy.sh: %s\n' "$*" >&2
  exit 1
}

check_requirements() {
  local dependency endpoint

  for dependency in docker python3 lsof; do
    command -v "$dependency" >/dev/null 2>&1 || fail "Required command not found: $dependency"
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
}

# Clean up TCP 8000 plus ports resolved from Compose and its environment settings.
get_required_ports() {
  docker compose config --format json | python3 -c '
import json, sys
ports = {(8000, "tcp")}
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
'
}

# Stop containers through Docker so restart policies do not respawn port owners.
stop_conflicting_containers() {
  local ports=$1 running conflicts id
  local running_ids=()

  # This also checks daemon access before any host processes are stopped.
  running=$(docker ps -q)
  [[ -n "$running" && -n "$ports" ]] || return 0

  while IFS= read -r id; do
    running_ids+=("$id")
  done <<< "$running"

  # Inspect host bindings: Docker's publish filter can match container ports.
  conflicts=$(docker inspect "${running_ids[@]}" | python3 -c '
import json, sys
wanted = set(sys.argv[1].splitlines())
for container in json.load(sys.stdin):
    bindings = container.get("NetworkSettings", {}).get("Ports") or {}
    if any(binding["HostPort"] + "/" + target.rsplit("/", 1)[-1] in wanted
           for target, entries in bindings.items() for binding in (entries or [])):
        print(container["Id"])
' "$ports")

  [[ -n "$conflicts" ]] || return 0

  while IFS= read -r id; do
    printf 'Stopping container %s to release a required port...\n' "$id"
    docker stop -t "$STOP_TIMEOUT_SECONDS" "$id"
  done <<< "$conflicts"
}

as_root() {
  if [[ "$EUID" -eq 0 ]]; then
    "$@"
  else
    command -v sudo >/dev/null 2>&1 || fail "sudo is required to inspect or stop another user's port listener."
    sudo -- "$@"
  fi
}

is_port_available() {
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

get_listener_pids() {
  local port=$1 protocol=$2 result status
  local args=(-nP -t "-iTCP:${port}" -sTCP:LISTEN)

  result=$(lsof "${args[@]}" 2>&1) || {
    status=$?
    # lsof returns 1 with no output when no matching sockets exist.
    [[ "$status" -eq 1 && -z "$result" ]] || fail "Unable to inspect $port/$protocol: $result"
  }

  # lsof may hide other users' processes. Probe binding before declaring it free.
  if [[ -z "$result" ]] && ! is_port_available "$port"; then
    result=$(as_root lsof "${args[@]}") || fail "Cannot bind $port/$protocol or identify its owner."
    [[ -n "$result" ]] || fail "$port/$protocol is unavailable, but no listener was found."
  fi
  printf '%s\n' "$result"
}

send_signal() {
  local signal=$1 pid=$2

  # Elevate only if needed; the process may already have exited.
  kill "-$signal" "$pid" 2>/dev/null || as_root kill "-$signal" "$pid" || true
}

stop_listeners() {
  local port=$1 protocol=$2 pids=$3
  local pid process_name attempt remaining

  while IFS= read -r pid; do
    # A shared Docker backend must be managed through Docker, never killed.
    process_name=$(ps -p "$pid" -o comm= || true)
    case "$process_name" in
      *docker*|*Docker*|*containerd*|*rootlesskit*|*vpnkit*)
        fail "$port/$protocol is still held by Docker ($process_name, PID $pid). Stop the owning container or Docker context first."
        ;;
    esac

    printf 'Releasing %s/%s: sending TERM to PID %s (%s)...\n' "$port" "$protocol" "$pid" "$process_name"
    send_signal TERM "$pid"
  done <<< "$pids"

  for ((attempt = 0; attempt < STOP_TIMEOUT_SECONDS; attempt++)); do
    remaining=$(get_listener_pids "$port" "$protocol")
    [[ -n "$remaining" ]] || break
    sleep 1
  done

  # Only escalate for original listeners still holding this port.
  remaining=$(get_listener_pids "$port" "$protocol")
  while IFS= read -r pid; do
    if [[ -n "$pid" ]] && [[ $'\n'"$remaining"$'\n' == *$'\n'"$pid"$'\n'* ]]; then
      printf 'Sending KILL to PID %s on %s/%s...\n' "$pid" "$port" "$protocol"
      send_signal KILL "$pid"
    fi
  done <<< "$pids"
  sleep 1
}

free_port() {
  local port=$1 protocol=$2 pids remaining

  pids=$(get_listener_pids "$port" "$protocol")
  if [[ -n "$pids" ]]; then
    stop_listeners "$port" "$protocol" "$pids"
  fi

  remaining=$(get_listener_pids "$port" "$protocol")
  [[ -z "$remaining" ]] || fail "$port/$protocol is still occupied; a process may be restarting automatically."
}

free_required_ports() {
  local ports=$1 port protocol

  [[ -n "$ports" ]] || return 0

  while IFS=/ read -r port protocol; do
    free_port "$port" "$protocol"
  done <<< "$ports"
}

main() {
  local ports

  cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
  check_requirements
  ports=$(get_required_ports)

  stop_conflicting_containers "$ports"
  free_required_ports "$ports"

  printf 'Required ports are free. Starting Docker Compose...\n'
  exec docker compose up --build "$@"
}

main "$@"
