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

PTERO_DIR="${1:-${PTERO_DIR:-}}"
if [[ -z "$PTERO_DIR" ]]; then
  PTERO_DIR="$(find_panel_root "$SCRIPT_DIR" || true)"
fi
[[ -z "$PTERO_DIR" ]] && fail "Could not locate a Pterodactyl panel root. Pass it as: ./deploy.sh /path/to/pterodactyl"
is_panel_root "$PTERO_DIR" || fail "Invalid panel directory: $PTERO_DIR"
ok "Panel root: $PTERO_DIR"

find_custom_root() {
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
  if systemctl list-unit-files | grep -q '^pteroq\\.service'; then
    systemctl restart pteroq
    ok "Service restarted: pteroq"
  else
    warn "pteroq service not found; skipped restart."
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
