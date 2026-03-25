#!/bin/bash
set -e

PTERO="/var/www/pterodactyl"
REPO="git@github.com:dev-malvryx/ptero-theme.git"
THEME_DIR="$PTERO/custom"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[ptero-theme]${RESET} $1"; }
ok()   { echo -e "${GREEN}[✓]${RESET} $1"; }
fail() { echo -e "${RED}[✗]${RESET} $1"; exit 1; }

echo ""
echo -e "${CYAN}═══════════════════════════════════${RESET}"
echo -e "${CYAN}   ptero-theme deploy — Dev Malvryx ${RESET}"
echo -e "${CYAN}═══════════════════════════════════${RESET}"
echo ""

[ ! -d "$PTERO" ] && fail "Pterodactyl not found at $PTERO"
ok "Pterodactyl found"

log "Pulling latest theme..."
cd "$PTERO"
git pull origin main
ok "Theme updated"

log "Applying custom files..."

apply() {
  local src="$THEME_DIR/$1"
  local dst="$PTERO/$2"
  if [ -f "$src" ]; then
    [ ! -f "${dst}.original" ] && cp "$dst" "${dst}.original"
    cp "$src" "$dst"
    ok "Applied: $2"
  fi
}

apply "scripts/components/auth/LoginContainer.tsx" \
      "resources/scripts/components/auth/LoginContainer.tsx"

log "Rebuilding assets..."
yarn build:production
ok "Assets rebuilt"

chown -R www-data:www-data "$PTERO"
php artisan cache:clear
php artisan config:clear
php artisan view:clear
systemctl restart pteroq

echo ""
echo -e "${GREEN}   Deploy complete! 🚀${RESET}"
echo ""
