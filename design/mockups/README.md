#!/bin/bash
# design/mockups/README.md explica qué hay aquí
# Este script descarga los mockups si no están presentes.
# Ejecutar: bash design/mockups/download_mockups.sh

MOCKUPS_DIR="$(dirname "$0")"

echo "Los mockups deben copiarse manualmente a esta carpeta."
echo ""
echo "Archivos necesarios:"
echo "  - mockup_client_app.html   (app del cliente: menú, carrito, tracking)"
echo "  - mockup_kitchen_kds.html  (KDS cocina: tickets, login, recall)"
echo "  - mockup_admin_app.html    (admin: dashboard, menú, mesas)"
echo ""
echo "Estos archivos fueron generados por Claude en claude.ai."
echo "Solicítalos al coordinador del proyecto o descárgalos de la conversación original."
