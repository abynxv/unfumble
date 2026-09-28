#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# migrate.sh — Alembic database migration helper
#
# Commands:
#   ./migrate.sh generate "describe your change"   Create a new migration
#   ./migrate.sh upgrade                           Apply all pending migrations
#   ./migrate.sh downgrade                         Roll back one migration
#   ./migrate.sh status                            Show current revision
#   ./migrate.sh history                           Show full migration history
#   ./migrate.sh reset                             ⚠ Downgrade to base (empty DB)
#
# Run this AFTER filling in backend/.env with a valid DATABASE_URL.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}${BOLD}[migrate]${RESET}  $*"; }
ok()   { echo -e "${GREEN}✓${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✗${RESET}  $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# ── Locate alembic ────────────────────────────────────────────────────────────
find_alembic() {
  for candidate in \
    "$SCRIPT_DIR/.venv/bin/alembic" \
    "$BACKEND_DIR/.venv/bin/alembic"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"; return
    fi
  done
  # Try system path
  if command -v alembic &>/dev/null; then
    command -v alembic; return
  fi
  err "alembic not found. Activate your venv: source .venv/bin/activate"
  exit 1
}

# ── Guards ────────────────────────────────────────────────────────────────────
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  err "backend/.env not found."
  err "Copy backend/.env.example → backend/.env and fill in DATABASE_URL."
  exit 1
fi

ALEMBIC=$(find_alembic)
ok "alembic → $ALEMBIC"

# Always run alembic from the backend directory so it finds alembic.ini
cd "$BACKEND_DIR"

# ── Commands ──────────────────────────────────────────────────────────────────
COMMAND="${1:-help}"

case "$COMMAND" in

  generate|gen|new)
    MSG="${2:-}"
    if [[ -z "$MSG" ]]; then
      err "Provide a description: ./migrate.sh generate \"add user table\""
      exit 1
    fi
    log "Generating migration: \"$MSG\""
    "$ALEMBIC" revision --autogenerate -m "$MSG"
    ok "Migration file created in backend/alembic/versions/"
    echo ""
    warn "Review the generated file before applying!"
    warn "Run: ./migrate.sh upgrade"
    ;;

  upgrade|up|apply)
    TARGET="${2:-head}"
    log "Applying migrations → $TARGET"
    "$ALEMBIC" upgrade "$TARGET"
    ok "Database is up to date."
    ;;

  downgrade|down|rollback)
    TARGET="${2:--1}"
    warn "Rolling back → $TARGET"
    read -r -p "  Are you sure? (y/N) " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }
    "$ALEMBIC" downgrade "$TARGET"
    ok "Rollback complete."
    ;;

  status|current)
    log "Current database revision:"
    "$ALEMBIC" current
    ;;

  history|log)
    log "Migration history:"
    "$ALEMBIC" history --verbose
    ;;

  reset)
    err "This will downgrade to base (drop all managed tables)."
    read -r -p "  Type 'yes' to confirm: " confirm
    [[ "$confirm" == "yes" ]] || { log "Aborted."; exit 0; }
    "$ALEMBIC" downgrade base
    ok "Database reset to base."
    ;;

  help|--help|-h|*)
    echo ""
    echo -e "${BOLD}  migrate.sh — Alembic migration helper${RESET}"
    echo ""
    echo "  Commands:"
    echo -e "    ${CYAN}generate${RESET} \"message\"   Autogenerate a new migration from model changes"
    echo -e "    ${CYAN}upgrade${RESET}               Apply all pending migrations (to head)"
    echo -e "    ${CYAN}upgrade${RESET} <revision>    Apply up to a specific revision"
    echo -e "    ${CYAN}downgrade${RESET}             Roll back one step"
    echo -e "    ${CYAN}downgrade${RESET} <revision>  Roll back to a specific revision"
    echo -e "    ${CYAN}status${RESET}                Show current DB revision"
    echo -e "    ${CYAN}history${RESET}               Show full migration history"
    echo -e "    ${CYAN}reset${RESET}                 ⚠ Downgrade all the way to base"
    echo ""
    echo "  Typical first-time setup:"
    echo -e "    ${YELLOW}./migrate.sh generate \"initial schema\"${RESET}"
    echo -e "    ${YELLOW}./migrate.sh upgrade${RESET}"
    echo ""
    ;;
esac
