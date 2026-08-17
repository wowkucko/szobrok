#!/usr/bin/env bash
#
# Festett Szobrok — DigitalOcean droplet telepítő
# =================================================
# Futtatás root-ként egy friss Ubuntu 24.04 droplet-en:
#
#   bash scripts/deploy-digitalocean.sh
#
# Amit a szkript csinál:
#   1. Rendszerfrissítés + Node 24, git, nginx, ufw, certbot telepítés
#   2. A kód elérése (git clone VAGY a már scp-vel feltöltött /var/www/weblap)
#   3. .env.local ellenőrzése (ha hiányzik, sablonból létrehozza és megáll)
#   4. npm ci + build
#   5. pm2-vel indítás + újrainduláskori automatikus élesztés
#   6. Nginx reverse proxy + ingyenes SSL (Certbot) — ha a DNS már mutat ide
#   7. Tűzfal (22, 80, 443) + heti biztonsági mentés cronnal
#
# A szkript biztonságosan újrafuttatható: a kész lépéseket kihagyja.

set -euo pipefail

# ---------- Konfiguráció (szerkeszd igény szerint) ----------
DOMAIN="festettszobrok.com"
WWW_DOMAIN="www.festettszobrok.com"
APP_DIR="/var/www/weblap"
NODE_MAJOR="24"
APP_PORT="3000"
# A kód forrása: git clone ebből a repóból. Ha a repó privát, a szerveren
# először állíts be hozzáférést (pl. deploy key vagy PAT a .netrc-ben),
# különben a clone interaktív jelszókéréssel elakad. Üresen hagyva a szkript
# azt feltételezi, hogy a kódot már scp-vel felvitted a $APP_DIR-be.
REPO_URL="https://github.com/wowkucko/szobrok.git"

# ---------- Színes kimenet ----------
C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'; C_CYAN='\033[0;36m'; C_RED='\033[0;31m'; C_NC='\033[0m'
step()  { echo -e "\n${C_CYAN}▶ $1${C_NC}"; }
ok()    { echo -e "  ${C_GREEN}✓ $1${C_NC}"; }
warn()  { echo -e "  ${C_YELLOW}⚠ $1${C_NC}"; }
fail()  { echo -e "  ${C_RED}✗ $1${C_NC}"; }

if [ "$(id -u)" -ne 0 ]; then
  fail "Futtasd root-ként: sudo bash scripts/deploy-digitalocean.sh"
  exit 1
fi

# ---------- 1. Rendszer-alapok ----------
step "1/8 Rendszerfrissítés és csomagok telepítése"
export DEBIAN_FRONTEND=noninteractive
apt update -y && apt upgrade -y
apt install -y git nginx ufw curl ca-certificates gnupg build-essential

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt install -y nodejs
fi
ok "Node: $(node -v), npm: $(npm -v)"

# ---------- 2. A kód ----------
step "2/8 Alkalmazás elérése: $APP_DIR"
mkdir -p "$APP_DIR"
if [ -f "$APP_DIR/package.json" ]; then
  ok "A kód már itt van ($APP_DIR/package.json) — nem klónozom újra."
elif [ -n "$REPO_URL" ]; then
  git clone "$REPO_URL" "$APP_DIR"
  ok "Kód klónozva innen: $REPO_URL"
else
  fail "Nincs kód a $APP_DIR-ben, és a REPO_URL sincs beállítva."
  echo ""
  echo "  Két lehetőség:"
  echo "  1) Töltsd fel a kódot a helyi gépedről (Git Bash-ben):"
  echo "       scp -r C:/Users/Tomi/Desktop/weblap/* root@<IP>:$APP_DIR/"
  echo "  2) Vagy állítsd be a REPO_URL-t a szkript elején (privát git repo),"
  echo "     és futtasd újra."
  exit 1
fi
cd "$APP_DIR"

# A data/ mappa nélkül üres lesz a bolt! (DB + feltöltött képek)
if [ ! -f "$APP_DIR/data/artisanprints.db" ] || [ ! -d "$APP_DIR/data/uploads" ]; then
  warn "HIÁNYZIK a data/ mappa (artisanprints.db vagy uploads)."
  warn "A weboldal kód nélkülük üresen indul. Töltsd fel a helyi data/-t:"
  warn "  scp -r C:/Users/Tomi/Desktop/weblap/data root@<IP>:$APP_DIR/"
fi

# ---------- 3. .env.local ----------
step "3/8 Környezeti változók (.env.local)"
if [ -f "$APP_DIR/.env.local" ]; then
  ok ".env.local már létezik."
else
  cp "$APP_DIR/.env.example" "$APP_DIR/.env.local"
  fail "Nincs .env.local — létrehoztam a sablonból, de még KITÖLTETLEN."
  echo ""
  echo "  Szerkeszd meg, és futtasd újra a szkriptet:"
  echo "    nano $APP_DIR/.env.local"
  echo ""
  echo "  Kötelező kitölteni: ADMIN_USERNAME, ADMIN_PASSWORD,"
  echo "  NEXT_PUBLIC_SITE_URL=https://festettszobrok.com, és az SMTP-* mezők."
  exit 1
fi

# ---------- 4. Build ----------
step "4/8 Függőségek és build (ez eltarthat pár percig)"
npm ci
npm run build

# ---------- 5. pm2 ----------
step "5/8 Indítás pm2-vel (automatikus újraindulás)"
if ! command -v pm2 >/dev/null 2>&1; then
  npm i -g pm2
fi
if pm2 list 2>/dev/null | grep -q "weblap"; then
  ok "A weblap már fut pm2 alatt — újraindítom a friss builddel."
  pm2 restart weblap --update-env
else
  PORT="$APP_PORT" pm2 start npm --name weblap -- start
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ---------- 6. Nginx + SSL ----------
step "6/8 Nginx reverse proxy + Certbot SSL"
cat > /etc/nginx/sites-available/weblap <<EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/weblap /etc/nginx/sites-enabled/weblap
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx konfigurálva (80-as port, proxy a ${APP_PORT}-ra)."

# A Certbot csak akkor tud tanúsítványt kérni, ha a DNS már ide mutat.
IP=$(curl -s ifconfig.me || echo "")
if command -v certbot >/dev/null 2>&1; then
  :
else
  apt install -y certbot python3-certbot-nginx
fi
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  ok "SSL tanúsítvány már létezik."
else
  warn "A Certbot megpróbál SSL-t kérni. Ha a DNS (A rekord → $IP) még nem"
  warn "érvényes, ez hibát fog dobni — ilyenkor a beállítás után futtasd:"
  warn "  certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN}"
  certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos --redirect -m "hello@festettszobrok.com" || true
fi

# ---------- 7. Tűzfal ----------
step "7/8 Tűzfal (SSH, HTTP, HTTPS)"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable
ok "Tűzfal engedélyezve: 22, 80, 443."

# ---------- 8. Heti biztonsági mentés ----------
step "8/8 Heti biztonsági mentés (data/ mappa)"
mkdir -p /root/backups
CRON_LINE="0 3 * * 1 tar czf /root/backups/weblap-\$(date +\%F).tar.gz -C ${APP_DIR} data"
if crontab -l 2>/dev/null | grep -q "backups/weblap"; then
  ok "A mentési cron már létezik."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  ok "Heti mentés beállítva (hétfőnként 3:00 → /root/backups/)."
fi

# ---------- Kész ----------
step "Kész! ✅"
echo ""
echo "  A weboldal:      http://${DOMAIN}   (HTTP-ről HTTPS-re irányít)"
echo "  Admin:           http://${DOMAIN}/admin   (a .env.local-ben lévő jelszóval)"
echo "  Ellenőrzés:      curl -I https://${DOMAIN}/  →  200"
echo "                   https://${DOMAIN}/sitemap.xml"
echo "  Naplók:          pm2 logs weblap"
echo "  Újraindítás:     pm2 restart weblap"
echo ""
echo "  Jótanácsok:"
echo "   - Az Umami Cloudnál engedélyezd csak a ${DOMAIN} domaint."
echo "   - A droplet-re is készíts havi Snapshotot a DigitalOcean panelen."
echo "   - A frissítés a jövőben: bash ${APP_DIR}/scripts/update.sh"
