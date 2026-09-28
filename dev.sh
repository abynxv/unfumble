#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Start backend + frontend together in development mode
#
# Usage:
#   ./dev.sh            Start both servers (default)
#   ./dev.sh --backend  Start backend only
#   ./dev.sh --frontend Start frontend only
#
# Requirements:
#   - Python venv at ../.venv or ./backend/.venv
#   - Node.js / npm installed
#   - .env files filled in (see backend/.env.example, frontend/.env.example)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}${BOLD}[dev]${RESET}  $*"; }
ok()   { echo -e "${GREEN}✓${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✗${RESET}  $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# ── Argument parsing ─────────────────────────────────────────────────────────
RUN_BACKEND=true
RUN_FRONTEND=true

for arg in "$@"; do
  case $arg in
    --backend)  RUN_FRONTEND=false ;;
    --frontend) RUN_BACKEND=false  ;;
    --help|-h)
      echo "Usage: $0 [--backend | --frontend]"
      exit 0
      ;;
  esac
done

# ── Locate Python venv ───────────────────────────────────────────────────────
find_python() {
  # Priority: project-root .venv → backend .venv → system python
  for candidate in \
    "$SCRIPT_DIR/.venv/bin/python" \
    "$BACKEND_DIR/.venv/bin/python" \
    "$(command -v python3 2>/dev/null)" \
    "$(command -v python 2>/dev/null)"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"; return
    fi
  done
  err "Python not found. Create a venv: python3 -m venv .venv && source .venv/bin/activate"
  exit 1
}

find_uvicorn() {
  for candidate in \
    "$SCRIPT_DIR/.venv/bin/uvicorn" \
    "$BACKEND_DIR/.venv/bin/uvicorn"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"; return
    fi
  done
  # Fall back to python -m uvicorn
  echo "$(find_python) -m uvicorn"
}

# ── Pre-flight checks ─────────────────────────────────────────────────────────
preflight() {
  log "Running pre-flight checks…"

  if $RUN_BACKEND; then
    if [[ ! -f "$BACKEND_DIR/.env" ]]; then
      warn "backend/.env not found — copy backend/.env.example and fill in values"
      warn "The backend will likely fail to start without it."
    else
      ok "backend/.env found"
    fi

    PYTHON=$(find_python)
    ok "Python → $PYTHON"
  fi

  if $RUN_FRONTEND; then
    if [[ ! -f "$FRONTEND_DIR/.env" ]]; then
      warn "frontend/.env not found — copy frontend/.env.example and fill in values"
    else
      ok "frontend/.env found"
    fi

    if ! command -v npm &>/dev/null; then
      err "npm not found. Install Node.js first."
      exit 1
    fi
    ok "npm → $(npm --version)"

    if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
      log "node_modules missing — running npm install…"
      npm --prefix "$FRONTEND_DIR" install
    fi
  fi
}

# ── Cleanup on exit ───────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  log "Shutting down…"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  ok "Done."
}
trap cleanup INT TERM EXIT

# ── Start backend ─────────────────────────────────────────────────────────────
start_backend() {
  log "Starting FastAPI backend on http://localhost:8000 …"
  local UVICORN
  UVICORN=$(find_uvicorn)

  # shellcheck disable=SC2086
  cd "$BACKEND_DIR" && \
    $UVICORN app.main:app \
      --host 0.0.0.0 \
      --port 8000 \
      --reload \
      --reload-dir app \
      2>&1 | sed "s/^/${CYAN}[backend]${RESET} /" &
  PIDS+=($!)
  ok "Backend PID ${PIDS[-1]}"
}

# ── Start frontend ────────────────────────────────────────────────────────────
start_frontend() {
  log "Starting Vite frontend on http://localhost:5173 …"
  cd "$FRONTEND_DIR" && npm run dev 2>&1 | sed "s/^/${GREEN}[frontend]${RESET} /" &
  PIDS+=($!)
  ok "Frontend PID ${PIDS[-1]}"
}

# ── Main ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  AI Profile Studio — Dev Server${RESET}"
echo -e "  ─────────────────────────────────"
echo ""

preflight

$RUN_BACKEND  && start_backend
$RUN_FRONTEND && start_frontend

echo ""
log "All services started. Press Ctrl+C to stop."
echo ""
[[ "$RUN_BACKEND"  == true ]] && echo -e "  ${BOLD}Backend  →${RESET}  http://localhost:8000"
[[ "$RUN_BACKEND"  == true ]] && echo -e "  ${BOLD}API docs →${RESET}  http://localhost:8000/docs"
[[ "$RUN_FRONTEND" == true ]] && echo -e "  ${BOLD}Frontend →${RESET}  http://localhost:5173"
echo ""

# Wait for any child to exit (if one crashes, we stay alive for the other)
wait
