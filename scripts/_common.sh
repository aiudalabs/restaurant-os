# Shared helpers for scripts/*.sh (sourced, not executed). docs/ENVIRONMENTS.md
set -euo pipefail

FIREBASE="npx -y firebase-tools@15.30.2"   # pinned: the global 14.x CLI has an RTDB rules bug
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }
step() { printf '\n▸ %s\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }

# DRY_RUN=1 scripts/… prints the commands that change something instead of running them.
run() {
  if [ "${DRY_RUN:-}" = "1" ]; then { printf '  [dry-run] %q' "$1"; shift; printf ' %q' "$@"; printf '\n'; } >&2; return 0; fi
  "$@"
}

# Project ID behind an alias of .firebaserc (dev, prod, …); empty when missing.
project_of() {
  python3 -c "import json,sys; print(json.load(open('.firebaserc')).get('projects',{}).get(sys.argv[1],''))" "$1"
}

# Production guard: main, up to date with origin, no local edits in what gets
# deployed, and the operator types the environment name to confirm.
guard_prod() {
  local what="$1"; shift
  local branch
  branch="$(git branch --show-current)"
  [ "$branch" = "main" ] || die "A producción solo se despliega desde main (estás en '$branch')."
  git fetch -q origin main
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "main local no coincide con origin/main. Haz git pull (o push) primero."
  local dirty
  dirty="$(git status --porcelain -- "$@")"
  [ -z "$dirty" ] || die "Hay cambios sin commitear en lo que se despliega:
$dirty"
  printf '\n⚠  Vas a desplegar a PRODUCCIÓN: %s\n   Escribe «prod» para continuar: ' "$what"
  local answer
  read -r answer
  [ "$answer" = "prod" ] || die "Cancelado."
}
