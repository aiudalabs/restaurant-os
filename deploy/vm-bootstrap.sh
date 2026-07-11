#!/usr/bin/env bash
# Runs ON the VM (copied there by install.sh). Installs Docker, renders config
# from .env, starts the stack, and schedules nightly backups. Idempotent.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

echo "== Installing Docker (if missing) =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
sudo usermod -aG docker "$USER" || true

echo "== Rendering odoo.conf from .env =="
sed -e "s|__ODOO_MASTER_PASSWORD__|${ODOO_MASTER_PASSWORD}|g" \
    -e "s|__POSTGRES_USER__|${POSTGRES_USER}|g" \
    -e "s|__POSTGRES_PASSWORD__|${POSTGRES_PASSWORD}|g" \
    odoo.conf.template > odoo.conf

echo "== Starting the stack (Postgres + Odoo + BFF + Caddy) =="
sudo docker compose up -d --build

echo "== Scheduling nightly backups (02:30) =="
CRON="30 2 * * * cd $(pwd) && ./backup.sh >> /var/log/ros-backup.log 2>&1"
( sudo crontab -l 2>/dev/null | grep -v 'backup.sh' ; echo "$CRON" ) | sudo crontab -

echo "== Up. Odoo: https://${ODOO_DOMAIN}   BFF: https://${BFF_DOMAIN} =="
echo "   (TLS works once DNS A records point at this VM's IP.)"
echo "   First run: open Odoo, create DB '${ODOO_DB}' with the master password."
