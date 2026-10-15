#!/usr/bin/env bash
# Local Zaveli endpoint (issue #59): the BFF on 127.0.0.1, against the DEV
# Firestore only, serving POST /zaveli/tools and POST /zaveli/events.
#
#   scripts/zaveli-endpoint.sh start     # background; waits until it answers
#   scripts/zaveli-endpoint.sh stop
#   scripts/zaveli-endpoint.sh status
#
# Config lives in apps/fastapi_bff/.zaveli-dev/.env (gitignored), never in the
# BFF's own .env (that one points at prod):
#   FIREBASE_PROJECT_ID=restaurant-os-dev-49096
#   ZAVELI_SIGNING_SECRETS=zsk_…            # new,previous during a rotation
# Firestore access: Application Default Credentials (gcloud auth application-default login).
# Port: ZAVELI_ENDPOINT_PORT (default 8040).
source "$(dirname "$0")/_common.sh"

DEV_PROJECT="restaurant-os-dev-49096"
PORT="${ZAVELI_ENDPOINT_PORT:-8040}"
BFF="$ROOT/apps/fastapi_bff"
STATE="$BFF/.zaveli-dev"
PID_FILE="$STATE/endpoint.pid"
LOG="$STATE/endpoint.log"
HEALTH="http://127.0.0.1:$PORT/zaveli/health"

running_pid() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null || return 1
  echo "$pid"
}

start() {
  [ -x "$BFF/.venv/bin/python" ] || die "Falta el venv del BFF: uv venv --python 3.12 apps/fastapi_bff/.venv && uv pip install --python apps/fastapi_bff/.venv/bin/python -r apps/fastapi_bff/requirements.txt"
  [ -f "$STATE/.env" ] || die "Falta $STATE/.env (ver la cabecera de este script)."
  grep -qx "FIREBASE_PROJECT_ID=$DEV_PROJECT" "$STATE/.env" || die "$STATE/.env no apunta a dev ($DEV_PROJECT)."
  if pid="$(running_pid)"; then ok "Ya está corriendo (pid $pid) en http://127.0.0.1:$PORT"; return; fi
  ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || die "El puerto $PORT ya está ocupado por otro proceso."

  step "Arrancando el endpoint de Zaveli en http://127.0.0.1:$PORT (Firestore: $DEV_PROJECT)"
  # cwd = $STATE so the settings read its .env; the project is forced to dev and
  # the service-account path of the BFF's .env is never inherited.
  (cd "$STATE"; env -u GOOGLE_APPLICATION_CREDENTIALS \
      FIREBASE_PROJECT_ID="$DEV_PROJECT" FIREBASE_RTDB_URL="" GOOGLE_CLOUD_PROJECT="$DEV_PROJECT" \
      nohup "$BFF/.venv/bin/python" -m uvicorn app.main:app --app-dir "$BFF" \
      --host 127.0.0.1 --port "$PORT" >"$LOG" 2>&1 & echo $! >"$PID_FILE")

  for _ in $(seq 1 60); do
    if body="$(curl -sf "$HEALTH" 2>/dev/null)"; then
      python3 -c "import json,sys; h=json.loads(sys.argv[1]); assert h['project']==sys.argv[2], h['project']; print('  ✓ project', h['project'], '· signing secret', h['signing_secret'])" "$body" "$DEV_PROJECT" \
        || { stop; die "El endpoint no apunta a dev. Detenido."; }
      ok "Logs: $LOG"
      return
    fi
    sleep 0.5
  done
  die "No respondió en 30 s. Mira $LOG"
}

stop() {
  if pid="$(running_pid)"; then
    kill "$pid"
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.25; done
    ok "Detenido (pid $pid)"
  else
    ok "No estaba corriendo"
  fi
  rm -f "$PID_FILE"
}

status() {
  if pid="$(running_pid)"; then
    ok "Corriendo (pid $pid): $(curl -sf "$HEALTH" || echo 'sin respuesta')"
  else
    ok "Detenido"
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) die "Uso: scripts/zaveli-endpoint.sh start|stop|status" ;;
esac
