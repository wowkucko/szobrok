#!/usr/bin/env bash
#
# Festett Szobrok — éles verziófrissítő
# ======================================
# A szerveren root-ként futtatva a GitHubról lehúzza a legújabb kódot,
# újraépíti, és újraindítja a pm2 alatt futó alkalmazást.
#
#   bash scripts/update.sh
#
# A data/ mappa (adatbázis + feltöltött képek) érintetlen marad — az
# nincs a repóban, azt ne töröld soha.

set -euo pipefail

APP_DIR="/var/www/weblap"
APP_NAME="weblap"

C_GREEN='\033[0;32m'; C_RED='\033[0;31m'; C_NC='\033[0m'
ok()   { echo -e "  ${C_GREEN}✓ $1${C_NC}"; }
fail() { echo -e "  ${C_RED}✗ $1${C_NC}"; }

if [ "$(id -u)" -ne 0 ]; then
  fail "Futtasd root-ként: sudo bash scripts/update.sh"
  exit 1
fi

cd "$APP_DIR"

if [ ! -d .git ]; then
  fail "Nincs git repo a $APP_DIR-ben — a frissítés csak git-telepítésnél működik."
  echo "  Telepítés: bash $APP_DIR/scripts/deploy-digitalocean.sh"
  exit 1
fi

echo "▶ 1/4 Friss kód letöltése (git pull)"
git pull

echo "▶ 2/4 Függőségek szinkronizálása"
npm ci

echo "▶ 3/4 Build (ez eltarthat pár percig)"
npm run build

echo "▶ 4/4 Újraindítás pm2-vel"
pm2 restart "$APP_NAME" --update-env
pm2 save >/dev/null

ok "Kész — a weboldal az új verziót szolgálja ki."
echo ""
echo "  Ellenőrzés: curl -I https://festettszobrok.com/"
echo "  Naplók:     pm2 logs $APP_NAME"
