#!/bin/bash
# setup_odoo_demo.sh — Levanta Odoo demo para integración con RestaurantOS

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}══════════════════════════════════════${NC}"
echo -e "${BLUE}  Odoo Demo — RestaurantOS Integration${NC}"
echo -e "${BLUE}══════════════════════════════════════${NC}"

# Verificar Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker no instalado${NC}"
  echo "  brew install --cask docker"
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}✗ Docker Desktop no está corriendo${NC}"
  echo "  Ábrelo desde Applications"
  exit 1
fi

echo -e "${GREEN}✓ Docker disponible${NC}"

# Crear directorios necesarios
mkdir -p odoo_config odoo_addons

# Crear odoo.conf si no existe
if [ ! -f odoo_config/odoo.conf ]; then
cat > odoo_config/odoo.conf << 'EOF'
[options]
addons_path = /mnt/extra-addons,/usr/lib/python3/dist-packages/odoo/addons
data_dir = /var/lib/odoo
db_host = db
db_port = 5432
db_user = odoo
db_password = odoo_demo_2024
http_port = 8069
log_level = warn
EOF
echo -e "${GREEN}✓ odoo.conf creado${NC}"
fi

# Levantar servicios
echo -e "\n  Levantando Odoo 17 + PostgreSQL..."
docker compose up -d

# Esperar a Odoo
echo -n "  Esperando Odoo"
for i in $(seq 1 60); do
  sleep 2
  if curl -sf http://localhost:8069/web/health > /dev/null 2>&1; then
    echo -e " ${GREEN}✓ (${i}×2s)${NC}"
    break
  fi
  echo -n "."
done

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  Odoo corriendo en:${NC}"
echo -e "  ${BLUE}http://localhost:8069${NC}"
echo ""
echo -e "  Próximo paso: crear la base de datos"
echo -e "  → Abre el URL arriba"
echo -e "  → Database: ${YELLOW}restaurantes_demo${NC}"
echo -e "  → Email: ${YELLOW}admin@demo.com${NC}"
echo -e "  → Password: ${YELLOW}admin${NC}"
echo -e "  → Instala: ${YELLOW}Point of Sale, Restaurant${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
