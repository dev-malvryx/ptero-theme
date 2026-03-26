#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[ptero-theme]${RESET} $1"; }
ok()   { echo -e "${GREEN}[✓]${RESET} $1"; }
warn() { echo -e "${YELLOW}[!]${RESET} $1"; }
fail() { echo -e "${RED}[✗]${RESET} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo -e "${CYAN}===================================${RESET}"
echo -e "${CYAN}   ptero-theme auto installer${RESET}"
echo -e "${CYAN}===================================${RESET}"
echo

FROM_REPO=0
REPO_URL="${THEME_REPO:-https://github.com/dev-malvryx/ptero-theme.git}"
REPO_BRANCH="${THEME_BRANCH:-main}"
PTERO_ARG=""

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh [panel_path]
  ./deploy.sh --from-repo [--repo URL] [--branch BRANCH] [panel_path]

Options:
  --from-repo      Pull or clone theme repo before merge/install.
  --repo URL       Theme git repository URL.
  --branch NAME    Branch to checkout when using --from-repo.
  -h, --help       Show this help.

Env:
  PTERO_DIR        Panel path (alternative to positional path).
  THEME_REPO       Default repo URL for --from-repo.
  THEME_BRANCH     Default repo branch for --from-repo.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
  --from-repo)
    FROM_REPO=1
    shift
    ;;
  --repo)
    [[ $# -lt 2 ]] && fail "Missing value for --repo"
    REPO_URL="$2"
    shift 2
    ;;
  --branch)
    [[ $# -lt 2 ]] && fail "Missing value for --branch"
    REPO_BRANCH="$2"
    shift 2
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    if [[ -z "$PTERO_ARG" ]]; then
      PTERO_ARG="$1"
      shift
    else
      fail "Unknown argument: $1"
    fi
    ;;
  esac
done

is_panel_root() {
  local dir="$1"
  [[ -f "$dir/artisan" && -d "$dir/resources/scripts" && -f "$dir/public/index.php" ]]
}

find_panel_root() {
  local start="$1"
  local cur="$start"

  while [[ "$cur" != "/" ]]; do
    if is_panel_root "$cur"; then
      echo "$cur"
      return 0
    fi
    cur="$(dirname "$cur")"
  done

  for candidate in "$PWD" "/var/www/pterodactyl" "/srv/pterodactyl"; do
    if is_panel_root "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

PTERO_DIR="${PTERO_ARG:-${PTERO_DIR:-}}"
if [[ -z "$PTERO_DIR" ]]; then
  PTERO_DIR="$(find_panel_root "$SCRIPT_DIR" || true)"
fi
[[ -z "$PTERO_DIR" ]] && fail "Could not locate a Pterodactyl panel root. Pass it as: ./deploy.sh /path/to/pterodactyl"
is_panel_root "$PTERO_DIR" || fail "Invalid panel directory: $PTERO_DIR"
ok "Panel root: $PTERO_DIR"

REMOTE_THEME_BASE=""
if [[ "$FROM_REPO" -eq 1 ]]; then
  command -v git >/dev/null 2>&1 || fail "git is required for --from-repo"
  CACHE_ROOT="${TMPDIR:-/tmp}/ptero-theme-cache"
  REMOTE_THEME_BASE="$CACHE_ROOT/$(echo "$REPO_URL" | sed 's#[^a-zA-Z0-9._-]#_#g')"

  mkdir -p "$CACHE_ROOT"
  if [[ -d "$REMOTE_THEME_BASE/.git" ]]; then
    log "Updating theme repo cache..."
    git -C "$REMOTE_THEME_BASE" fetch --all --prune
    git -C "$REMOTE_THEME_BASE" checkout "$REPO_BRANCH"
    git -C "$REMOTE_THEME_BASE" pull --ff-only origin "$REPO_BRANCH"
  else
    log "Cloning theme repo..."
    git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$REMOTE_THEME_BASE"
  fi

  ok "Theme repo ready: $REMOTE_THEME_BASE ($REPO_BRANCH)"
fi

find_custom_root() {
  if [[ -n "$REMOTE_THEME_BASE" ]]; then
    local remote_candidates=(
      "$REMOTE_THEME_BASE/custom"
      "$REMOTE_THEME_BASE"
    )

    for c in "${remote_candidates[@]}"; do
      [[ -d "$c/scripts" ]] && { echo "$c"; return 0; }
    done
  fi

  local candidates=(
    "$SCRIPT_DIR/custom"
    "$SCRIPT_DIR"
    "$PTERO_DIR/custom"
    "$PWD/custom"
    "$PWD"
  )

  for c in "${candidates[@]}"; do
    [[ -d "$c/scripts" ]] && { echo "$c"; return 0; }
  done

  return 1
}

THEME_ROOT="$(find_custom_root || true)"
[[ -z "$THEME_ROOT" ]] && fail "Could not find custom theme files. Expected a folder containing scripts/"
ok "Theme source: $THEME_ROOT"

BACKUP_ROOT="$PTERO_DIR/storage/theme-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_ROOT"
ok "Backup path: $BACKUP_ROOT"

sync_tree() {
  local src_dir="$1"
  local dst_dir="$2"
  local label="$3"

  [[ ! -d "$src_dir" ]] && return 0
  mkdir -p "$dst_dir"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --backup --backup-dir="$BACKUP_ROOT" --mkpath "$src_dir/" "$dst_dir/"
  else
    warn "rsync not found; using cp fallback (backup metadata less precise)."
    cp -a "$src_dir/." "$dst_dir/"
  fi

  ok "Merged: $label"
}

log "Merging custom files..."
sync_tree "$THEME_ROOT/scripts" "$PTERO_DIR/resources/scripts" "scripts -> resources/scripts"
sync_tree "$THEME_ROOT/views" "$PTERO_DIR/resources/views" "views -> resources/views"
sync_tree "$THEME_ROOT/assets" "$PTERO_DIR/public/assets" "assets -> public/assets"
sync_tree "$THEME_ROOT/themes" "$PTERO_DIR/public/themes" "themes -> public/themes"

if [[ -f "$THEME_ROOT/tsconfig.json" ]]; then
  mkdir -p "$PTERO_DIR/custom"
  cp "$THEME_ROOT/tsconfig.json" "$PTERO_DIR/custom/tsconfig.json"
  ok "Installed: custom/tsconfig.json"
fi

log "Building panel assets..."
cd "$PTERO_DIR"

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [[ "$NODE_MAJOR" =~ ^[0-9]+$ ]] && (( NODE_MAJOR >= 17 )); then
    if [[ "${NODE_OPTIONS:-}" != *"--openssl-legacy-provider"* ]]; then
      if [[ -n "${NODE_OPTIONS:-}" ]]; then
        export NODE_OPTIONS="${NODE_OPTIONS} --openssl-legacy-provider"
      else
        export NODE_OPTIONS="--openssl-legacy-provider"
      fi
    fi
    warn "Node $NODE_MAJOR detected; enabling --openssl-legacy-provider for webpack compatibility."
  fi
else
  warn "Node was not found in PATH before build step."
fi

if command -v yarn >/dev/null 2>&1; then
  yarn build:production
elif command -v npm >/dev/null 2>&1; then
  npm run build:production
else
  fail "Neither yarn nor npm is installed; cannot build assets."
fi
ok "Assets built"

log "Clearing Laravel caches..."
php artisan cache:clear
php artisan config:clear
php artisan view:clear
ok "Caches cleared"

if command -v systemctl >/dev/null 2>&1; then
  RESTARTED_SERVICE=""
  for svc in pteroq pterodactyl-queue-worker pterodactyl-queue queue-worker; do
    if systemctl restart "$svc" >/dev/null 2>&1; then
      RESTARTED_SERVICE="$svc"
      break
    fi
  done

  if [[ -n "$RESTARTED_SERVICE" ]]; then
    ok "Service restarted: $RESTARTED_SERVICE"
  else
    warn "No known queue systemd service found (pteroq/pterodactyl-queue-worker). If you use Supervisor or Docker, restart the queue there instead."
  fi
else
  warn "systemctl not available; skipped service restart."
fi

if id -u www-data >/dev/null 2>&1; then
  chown -R www-data:www-data "$PTERO_DIR"
  ok "Ownership set to www-data:www-data"
else
  warn "User www-data not found; skipped chown."
fi

echo
echo -e "${GREEN}Deploy complete.${RESET}"
echo -e "${CYAN}Panel:${RESET} $PTERO_DIR"
echo -e "${CYAN}Theme:${RESET} $THEME_ROOT"
echo -e "${CYAN}Backup:${RESET} $BACKUP_ROOT"
echo
