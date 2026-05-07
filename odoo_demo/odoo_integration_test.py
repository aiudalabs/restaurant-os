#!/usr/bin/env python3
"""
odoo_integration_test.py
========================
Script de prueba de integración Odoo ↔ RestaurantOS.
Verifica que puedes:
1. Autenticarte con Odoo JSON-RPC
2. Leer productos del POS
3. Crear una sesión de POS
4. Crear una orden de prueba
5. Leer el estado de la orden

Uso:
  pip install xmlrpc requests
  python odoo_integration_test.py

Cambia las constantes ODOO_* según tu demo.
"""

import xmlrpc.client
import json
import sys
from datetime import datetime

# ── Config — ajusta según tu demo ──────────────────────────────────────────────
ODOO_URL      = "http://localhost:8069"
ODOO_DB       = "restaurantes_demo"
ODOO_USER     = "admin"
ODOO_PASSWORD = "admin"

# ── Colores para la terminal ────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"

def ok(msg):  print(f"  {GREEN}✓{RESET} {msg}")
def err(msg): print(f"  {RED}✗{RESET} {msg}")
def info(msg):print(f"  {BLUE}→{RESET} {msg}")
def warn(msg):print(f"  {YELLOW}!{RESET} {msg}")

def sep(title=""):
    if title:
        print(f"\n{BLUE}── {title} {'─'*(40-len(title))}{RESET}")
    else:
        print(f"{BLUE}{'─'*46}{RESET}")


def test_xmlrpc_auth():
    """Test 1: Autenticación via XML-RPC (el protocolo nativo de Odoo)."""
    sep("TEST 1: Autenticación XML-RPC")
    try:
        common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
        version = common.version()
        ok(f"Odoo conectado: v{version['server_version']}")

        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
        if not uid:
            err(f"Auth fallida — verifica usuario/contraseña")
            return None
        ok(f"Autenticado como UID={uid}")
        return uid
    except Exception as e:
        err(f"Conexión fallida: {e}")
        info(f"¿Odoo está corriendo en {ODOO_URL}?")
        return None


def test_read_pos_products(uid):
    """Test 2: Leer productos del Point of Sale."""
    sep("TEST 2: Productos del POS")
    try:
        models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")

        # Buscar productos disponibles en el POS
        product_ids = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'product.product', 'search',
            [[['available_in_pos', '=', True]]],
            {'limit': 10}
        )

        if not product_ids:
            warn("No hay productos configurados en el POS")
            info("Crea productos en POS → Productos en Odoo primero")
            return []

        products = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'product.product', 'read',
            [product_ids],
            {'fields': ['id', 'name', 'list_price', 'pos_category_id']}
        )

        ok(f"{len(products)} productos encontrados:")
        for p in products[:5]:
            cat = p['pos_category_id'][1] if p['pos_category_id'] else 'Sin categoría'
            print(f"    [{p['id']}] {p['name']} — ${p['list_price']:.2f} ({cat})")

        return products
    except Exception as e:
        err(f"Error leyendo productos: {e}")
        return []


def test_read_pos_config(uid):
    """Test 3: Leer configuración del POS (restaurante, mesas, etc.)."""
    sep("TEST 3: Configuración POS")
    try:
        models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")

        configs = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'pos.config', 'search_read',
            [[]],
            {'fields': ['id', 'name', 'module_pos_restaurant', 'floor_ids']}
        )

        if not configs:
            warn("No hay configuración de POS")
            info("Crea una configuración en POS → Configuración en Odoo")
            return None

        ok(f"{len(configs)} configuración(es) de POS:")
        for c in configs:
            restaurant = "✓ Restaurante" if c['module_pos_restaurant'] else "✗ No es restaurante"
            print(f"    [{c['id']}] {c['name']} — {restaurant}")
        return configs[0]
    except Exception as e:
        err(f"Error leyendo POS config: {e}")
        return None


def test_create_order(uid, products, pos_config):
    """Test 4: Crear una orden de prueba via API."""
    sep("TEST 4: Crear orden de prueba")
    if not products:
        warn("Sin productos — saltando creación de orden")
        return None
    if not pos_config:
        warn("Sin configuración POS — saltando creación de orden")
        return None

    try:
        models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")

        # Buscar o crear sesión de POS abierta
        session_ids = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'pos.session', 'search',
            [[['state', '=', 'opened'], ['config_id', '=', pos_config['id']]]]
        )

        if not session_ids:
            warn("No hay sesión de POS abierta")
            info("Abre una sesión en POS → Sesión en Odoo")
            info("O ve a http://localhost:8069/pos/ui y abre el POS")
            return None

        session_id = session_ids[0]
        ok(f"Sesión POS activa: ID={session_id}")

        # Crear orden
        product = products[0]
        order_data = {
            'session_id': session_id,
            'lines': [(0, 0, {
                'product_id': product['id'],
                'qty': 2,
                'price_unit': product['list_price'],
                'price_subtotal': product['list_price'] * 2,
                'price_subtotal_incl': product['list_price'] * 2,
            })],
            'amount_total': product['list_price'] * 2,
            'amount_tax': 0,
            'amount_paid': 0,
            'amount_return': 0,
        }

        order_id = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'pos.order', 'create',
            [order_data]
        )

        ok(f"Orden creada: ID={order_id}")
        ok(f"  Producto: {product['name']} × 2 = ${product['list_price']*2:.2f}")

        # Leer la orden recién creada
        order = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'pos.order', 'read',
            [[order_id]],
            {'fields': ['id', 'name', 'state', 'amount_total', 'date_order']}
        )[0]

        ok(f"  Estado: {order['state']}")
        ok(f"  Referencia: {order['name']}")
        return order_id

    except Exception as e:
        err(f"Error creando orden: {e}")
        return None


def test_json_rpc(uid_from_xmlrpc):
    """Test 5: Verificar que JSON-RPC también funciona (para Flutter)."""
    sep("TEST 5: JSON-RPC (protocolo para Flutter)")
    try:
        import urllib.request

        payload = json.dumps({
            "jsonrpc": "2.0",
            "method": "call",
            "id": 1,
            "params": {
                "service": "common",
                "method": "authenticate",
                "args": [ODOO_DB, ODOO_USER, ODOO_PASSWORD, {}]
            }
        }).encode()

        req = urllib.request.Request(
            f"{ODOO_URL}/jsonrpc",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        response = urllib.request.urlopen(req, timeout=10)
        data = json.loads(response.read())

        uid = data.get("result")
        if uid:
            ok(f"JSON-RPC funciona: UID={uid}")
            ok("Flutter puede conectar directamente a este endpoint")
        else:
            err(f"JSON-RPC auth falló: {data.get('error')}")
    except Exception as e:
        err(f"JSON-RPC error: {e}")


def print_summary(results):
    sep("RESUMEN")
    for name, status in results.items():
        icon = f"{GREEN}✓{RESET}" if status else f"{RED}✗{RESET}"
        print(f"  {icon} {name}")

    print(f"""
{BLUE}Próximos pasos si todos los tests pasan:{RESET}
  1. Construir FastAPI BFF que envuelve estos endpoints
  2. FastAPI expone:
       POST /api/orders     → crea pos.order en Odoo
       GET  /api/products   → lista productos del POS
       GET  /api/orders/:id → estado de una orden
  3. Flutter conecta a FastAPI (no directamente a Odoo)
  4. Firebase solo para realtime del KDS (onSnapshot)
""")


if __name__ == "__main__":
    sep("Odoo ↔ RestaurantOS Integration Test")
    print(f"  URL:  {ODOO_URL}")
    print(f"  DB:   {ODOO_DB}")
    print(f"  User: {ODOO_USER}")

    results = {}

    uid = test_xmlrpc_auth()
    results["Autenticación XML-RPC"] = uid is not None

    if uid:
        products = test_read_pos_products(uid)
        results["Leer productos POS"] = len(products) > 0

        pos_config = test_read_pos_config(uid)
        results["Leer config POS"] = pos_config is not None

        order_id = test_create_order(uid, products, pos_config)
        results["Crear orden de prueba"] = order_id is not None

        test_json_rpc(uid)
        results["JSON-RPC (para Flutter)"] = True
    else:
        results["Leer productos POS"]  = False
        results["Leer config POS"]     = False
        results["Crear orden"]         = False
        results["JSON-RPC"]            = False

    print_summary(results)
