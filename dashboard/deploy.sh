#!/usr/bin/env bash
# Run the Bare Brilliant inventory dashboard: the media worker (huey) in the background,
# then the dashboard, then check that the port really answers.
#
#   ./deploy.sh              start; the dashboard stays in the foreground (Ctrl+C stops both)
#   ./deploy.sh -d           start both in the background and return
#   ./deploy.sh stop         stop the worker and the dashboard started by this script
#   ./deploy.sh status       what is running, and is the port open
#
# Environment (all optional):
#   DASHBOARD_HOST    bind address (default 127.0.0.1; 0.0.0.0 = reachable from the network)
#   DASHBOARD_PORT    port (default 8001)
#   OPEN_FIREWALL     auto | 0   allow the port in ufw/firewalld when binding publicly (default auto)
#   ALLOW_OPEN_ADMIN  1 = allow a public bind while DEBUG=True. DEBUG=True means NO LOGIN.
#   SKIP_MIGRATE      1 = skip `manage.py migrate`
#   PYTHON            interpreter (default: .venv, ../venv, then python3)
#   RUN_DIR, LOG_DIR  where pid files / logs go (default run/, logs/)
#   STOP_TIMEOUT      seconds to let the worker finish its current job on stop (default 30)
#
# One worker only: media/storage writes are serialised by a single huey worker.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

HOST="${DASHBOARD_HOST:-127.0.0.1}"
PORT="${DASHBOARD_PORT:-8001}"
RUN_DIR="${RUN_DIR:-run}"
LOG_DIR="${LOG_DIR:-logs}"
STOP_TIMEOUT="${STOP_TIMEOUT:-30}"
HUEY_PID="$RUN_DIR/huey.pid"
WEB_PID="$RUN_DIR/dashboard.pid"
DETACH=0
STARTED_HUEY=0
KEEP_RUNNING=0
DJ_DEBUG="" DJ_HOSTS="" DJ_FFMPEG=""

say()  { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: ./deploy.sh [start] [-d|--detach]   media worker (huey) in the background, then the dashboard
       ./deploy.sh stop                     stop what this script started
       ./deploy.sh status                   show what is running and whether the port is open

Environment: DASHBOARD_HOST (127.0.0.1) DASHBOARD_PORT (8001) OPEN_FIREWALL (auto|0)
  ALLOW_OPEN_ADMIN=1  SKIP_MIGRATE=1  PYTHON  RUN_DIR  LOG_DIR  STOP_TIMEOUT
EOF
}

# ----------------------------------------------------------------- helpers ---

find_python() {
  local candidate
  for candidate in "${PYTHON:-}" .venv/bin/python ../venv/bin/python venv/bin/python; do
    if [[ -n $candidate && -x $candidate ]]; then
      # absolute path without '..' (python warns about a non-canonical venv path); don't follow the symlink itself
      echo "$(cd "$(dirname "$candidate")" && pwd)/$(basename "$candidate")"; return
    fi
  done
  command -v python3 || die "no Python found (python3 -m venv .venv && .venv/bin/pip install -r requirements.txt)"
}

alive() { [[ -f $1 ]] && kill -0 "$(<"$1")" 2>/dev/null; }

is_loopback() { case "$HOST" in 127.*|localhost|::1) return 0 ;; esac; return 1; }

lan_ip() { hostname -I 2>/dev/null | awk '{print $1}' || true; }

# Is something accepting connections on 127.0.0.1:$1 ?
port_open() {
  "$PY" - "$1" <<'PY'
import socket, sys
s = socket.socket(); s.settimeout(1)
sys.exit(0 if s.connect_ex(("127.0.0.1", int(sys.argv[1]))) == 0 else 1)
PY
}

# Prints the HTTP status of a GET (redirects are not followed), or 0 when nothing answers.
http_status() {
  "$PY" - "$1" <<'PY'
import sys, urllib.error, urllib.request
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None
try:
    print(urllib.request.build_opener(NoRedirect).open(sys.argv[1], timeout=3).status)
except urllib.error.HTTPError as error:
    print(error.code)
except Exception:
    print(0)
PY
}

# The pid of a run_huey in this directory, not started by this script, that uses the same
# database/queue settings (a second worker on one queue would break the write serialisation).
other_worker() {
  local pid var mine theirs
  for pid in $(pgrep -f "manage.py run_huey" || true); do
    [[ $(readlink "/proc/$pid/cwd" 2>/dev/null || true) == "$PWD" ]] || continue
    for var in DJANGO_SETTINGS_MODULE SQLITE_PATH MEDIA_QUEUE_PATH MEDIA_ROOT; do
      mine="${!var-}"
      theirs=$(tr '\0' '\n' <"/proc/$pid/environ" 2>/dev/null | sed -n "s/^$var=//p" || true)
      [[ $mine == "$theirs" ]] || continue 2
    done
    echo "$pid"; return 0
  done
  return 1
}

read_settings() {
  local out
  out=$("$PY" - <<'PY' 2>&1
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
from django.conf import settings
print("DEBUG=%s" % settings.DEBUG)
print("ALLOWED_HOSTS=%s" % ",".join(settings.ALLOWED_HOSTS))
print("FFMPEG=%s" % settings.FFMPEG_BIN)
PY
  ) || die "cannot load the Django settings (is the virtualenv installed? pip install -r requirements.txt):"$'\n'"$out"
  DJ_DEBUG=$(sed -n 's/^DEBUG=//p' <<<"$out")
  DJ_HOSTS=$(sed -n 's/^ALLOWED_HOSTS=//p' <<<"$out")
  DJ_FFMPEG=$(sed -n 's/^FFMPEG=//p' <<<"$out")
}

# ------------------------------------------------------------- preflight ----

check_ffmpeg() {
  if ! command -v "$DJ_FFMPEG" >/dev/null 2>&1 && [[ ! -x $DJ_FFMPEG ]]; then
    warn "ffmpeg not found ('$DJ_FFMPEG'): video renditions will fail until ffmpeg + ffprobe are installed"
  fi
}

# DEBUG=True switches on the no-login staff auto-login (inventory/middleware.py): never expose that by accident.
guard_exposure() {
  is_loopback && return 0
  if [[ $DJ_DEBUG == True && ${ALLOW_OPEN_ADMIN:-0} != 1 ]]; then
    die "refusing to bind $HOST: DEBUG=True enables the no-login staff auto-login, so anyone who can reach port $PORT would get a superuser admin.
       Set DEBUG=False in .env and run 'manage.py createsuperuser', or set ALLOW_OPEN_ADMIN=1 to accept the risk (e.g. behind a VPN or SSH tunnel)."
  fi
  if [[ $DJ_DEBUG == True ]]; then
    warn "ALLOW_OPEN_ADMIN=1: the dashboard has NO login and will be reachable on $HOST:$PORT"
  fi
}

open_firewall() {
  is_loopback && return 0
  [[ ${OPEN_FIREWALL:-auto} == 0 ]] && return 0
  if command -v ufw >/dev/null 2>&1; then
    local state
    state=$(sudo -n ufw status 2>/dev/null | head -n 1 || true)
    case "$state" in
      *inactive*) say "ufw is inactive: it is not blocking port $PORT" ;;
      *active*)   if sudo -n ufw allow "$PORT/tcp" >/dev/null 2>&1; then say "ufw: allowed $PORT/tcp"
                  else warn "could not add the ufw rule; run: sudo ufw allow $PORT/tcp"; fi ;;
      *)          warn "cannot read the ufw status without sudo. If ufw is active, run: sudo ufw allow $PORT/tcp" ;;
    esac
  elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    if sudo -n firewall-cmd --permanent --add-port="$PORT/tcp" >/dev/null 2>&1 && sudo -n firewall-cmd --reload >/dev/null 2>&1; then
      say "firewalld: allowed $PORT/tcp"
    else
      warn "could not add the firewalld rule; run: sudo firewall-cmd --permanent --add-port=$PORT/tcp && sudo firewall-cmd --reload"
    fi
  else
    say "no ufw/firewalld on this host"
  fi
  say "on a cloud VM also open TCP $PORT in its security group / network firewall (this script cannot do that)"
}

# ---------------------------------------------------------------- start -----

start_huey() {
  local other
  if alive "$HUEY_PID"; then say "media worker already running (pid $(<"$HUEY_PID"))"; return; fi
  if other=$(other_worker); then
    warn "a run_huey (pid $other) is already running here and was not started by this script: not starting a second worker"
    return
  fi
  say "starting the media worker (huey) -> $LOG_DIR/huey.log"
  nohup setsid "$PY" manage.py run_huey >>"$LOG_DIR/huey.log" 2>&1 &
  echo $! >"$HUEY_PID"
  STARTED_HUEY=1
  sleep 2
  alive "$HUEY_PID" || { tail -n 20 "$LOG_DIR/huey.log" >&2; die "the media worker exited right after starting"; }
}

start_dashboard() {
  say "starting the dashboard on http://$HOST:$PORT"
  if [[ $DETACH == 1 ]]; then
    nohup setsid "$PY" manage.py runserver "$HOST:$PORT" --noreload >>"$LOG_DIR/dashboard.log" 2>&1 &
  else
    "$PY" manage.py runserver "$HOST:$PORT" --noreload &
  fi
  echo $! >"$WEB_PID"
}

wait_ready() {
  local i code
  for i in $(seq 1 60); do
    if ! alive "$WEB_PID"; then
      [[ $DETACH == 1 ]] && tail -n 20 "$LOG_DIR/dashboard.log" >&2
      die "the dashboard exited while starting"
    fi
    code=$(http_status "http://127.0.0.1:$PORT/admin/login/")
    case "$code" in
      200|301|302) say "port $PORT is open: the dashboard answers (HTTP $code)"; return ;;
      400) die "the dashboard answers HTTP 400 for 127.0.0.1: add it to ALLOWED_HOSTS in .env" ;;
    esac
    sleep 0.5
  done
  die "the dashboard did not answer on port $PORT within 30 s"
}

# From the network side: is the address people will actually use accepted by Django?
check_reachable() {
  is_loopback && return 0
  local ip="$HOST" code
  [[ $HOST == 0.0.0.0 ]] && ip=$(lan_ip)
  [[ -z $ip ]] && return 0
  code=$(http_status "http://$ip:$PORT/admin/login/")
  case "$code" in
    200|301|302) say "reachable at http://$ip:$PORT" ;;
    400) warn "http://$ip:$PORT answers HTTP 400: add $ip to ALLOWED_HOSTS and http://$ip:$PORT to CSRF_TRUSTED_ORIGINS in .env, then restart" ;;
    *)   warn "http://$ip:$PORT did not answer (HTTP $code)" ;;
  esac
}

# ----------------------------------------------------------------- stop -----

stop_pid() {  # stop_pid <pidfile> <name> [quiet]
  local file=$1 name=$2 quiet=${3:-} pid i
  if ! alive "$file"; then
    rm -f "$file"
    [[ -n $quiet ]] || say "$name: not running"
    return 0
  fi
  pid=$(<"$file")
  say "stopping $name (pid $pid)"
  kill -INT "$pid" 2>/dev/null || true                 # graceful: a running job may finish
  for ((i = 0; i < STOP_TIMEOUT * 2; i++)); do alive "$file" || break; sleep 0.5; done
  if alive "$file"; then kill -TERM "$pid" 2>/dev/null || true; sleep 2; fi
  if alive "$file"; then warn "$name did not stop, killing it"; kill -KILL "$pid" 2>/dev/null || true; fi
  rm -f "$file"
}

# On Ctrl+C, on any failure after startup, and when the foreground dashboard exits: leave nothing
# behind. A successful --detach sets KEEP_RUNNING=1 to skip this.
cleanup() {
  trap - EXIT INT TERM
  if [[ $KEEP_RUNNING == 1 ]]; then return 0; fi
  stop_pid "$WEB_PID" "dashboard" quiet
  if [[ $STARTED_HUEY == 1 ]]; then stop_pid "$HUEY_PID" "media worker" quiet; fi
}

show_status() {
  local other
  if alive "$HUEY_PID"; then say "media worker: running (pid $(<"$HUEY_PID"))"
  elif other=$(other_worker); then say "media worker: running (pid $other, not started by this script)"
  else say "media worker: NOT running - queued media jobs will wait"; fi
  if alive "$WEB_PID"; then say "dashboard   : running (pid $(<"$WEB_PID"))"; else say "dashboard   : not started by this script"; fi
  if port_open "$PORT"; then say "port $PORT    : open"; else say "port $PORT    : closed"; fi
}

# ----------------------------------------------------------------- main -----

for arg in "$@"; do
  case "$arg" in
    start|stop|status) CMD=$arg ;;
    -d|--detach) DETACH=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument '$arg' (try --help)" ;;
  esac
done
CMD="${CMD:-start}"

mkdir -p "$RUN_DIR" "$LOG_DIR"
PY=$(find_python)

case "$CMD" in
  stop)   stop_pid "$WEB_PID" "dashboard"; stop_pid "$HUEY_PID" "media worker"; exit 0 ;;
  status) show_status; exit 0 ;;
esac

read_settings
guard_exposure
check_ffmpeg

if alive "$WEB_PID"; then
  say "the dashboard is already running (pid $(<"$WEB_PID")); ./deploy.sh stop to restart it"
  start_huey
  show_status
  exit 0
fi
if port_open "$PORT"; then
  die "port $PORT is already in use: $(ss -ltnp "sport = :$PORT" 2>/dev/null | tail -n +2 | head -n 1 | tr -s ' ') (stop it, or set DASHBOARD_PORT)"
fi

if [[ ${SKIP_MIGRATE:-0} != 1 ]]; then
  say "applying migrations"
  "$PY" manage.py migrate --noinput >"$LOG_DIR/migrate.log" 2>&1 || { tail -n 20 "$LOG_DIR/migrate.log" >&2; die "migrate failed"; }
fi

trap 'exit 130' INT
trap 'exit 143' TERM
trap cleanup EXIT

open_firewall
start_huey
start_dashboard
wait_ready
check_reachable

echo
say "dashboard : http://127.0.0.1:$PORT/  ($([[ $DJ_DEBUG == True ]] && echo 'no login: DEBUG auto-login' || echo 'log in with a staff account'))"
say "logs      : $LOG_DIR/huey.log$([[ $DETACH == 1 ]] && echo ", $LOG_DIR/dashboard.log")"

if [[ $DETACH == 1 ]]; then
  KEEP_RUNNING=1
  say "running in the background; stop with: ./deploy.sh stop"
  exit 0
fi

say "Ctrl+C stops the dashboard and the worker"
wait "$(<"$WEB_PID")" || true
