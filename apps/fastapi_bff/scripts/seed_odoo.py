#!/usr/bin/env python3
"""
seed_odoo.py — Crea categorías y productos de demo en el POS de Odoo.

Uso:
  cd apps/fastapi_bff
  pip install -r requirements.txt
  cp .env.example .env   # y edita con tus valores
  python scripts/seed_odoo.py
"""
import os
import sys
import xmlrpc.client
from pathlib import Path

# Load .env from BFF root
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

ODOO_URL      = os.getenv("ODOO_URL", "http://localhost:8069")
ODOO_DB       = os.getenv("ODOO_DB", "restaurantes_demo")
ODOO_USER     = os.getenv("ODOO_USER", "admin")
ODOO_PASSWORD = os.getenv("ODOO_PASSWORD", "admin")

GREEN = "\033[92m"; RED = "\033[91m"; BLUE = "\033[94m"; RESET = "\033[0m"
ok  = lambda m: print(f"  {GREEN}✓{RESET} {m}")
err = lambda m: print(f"  {RED}✗{RESET} {m}")
inf = lambda m: print(f"  {BLUE}→{RESET} {m}")

CATEGORIES = [
    {"name": "Pizzas",    "sequence": 10},
    {"name": "Cervezas",  "sequence": 20},
    {"name": "Bebidas",   "sequence": 30},
    {"name": "Postres",   "sequence": 40},
]

PRODUCTS = [
    {"name": "Pizza Margherita", "price": 12.50, "category": "Pizzas"},
    {"name": "Pizza Pepperoni",  "price": 14.00, "category": "Pizzas"},
    {"name": "Pizza 4 Quesos",   "price": 15.00, "category": "Pizzas"},
    {"name": "Pizza Hawaiana",   "price": 13.50, "category": "Pizzas"},
    {"name": "Cerveza Balboa",   "price":  3.00, "category": "Cervezas"},
    {"name": "Cerveza Panama",   "price":  3.00, "category": "Cervezas"},
    {"name": "Cerveza Atlas",    "price":  2.75, "category": "Cervezas"},
    {"name": "Cerveza Corona",   "price":  4.00, "category": "Cervezas"},
    {"name": "Coca-Cola",        "price":  2.00, "category": "Bebidas"},
    {"name": "Agua Mineral",     "price":  1.50, "category": "Bebidas"},
    {"name": "Jugo de Naranja",  "price":  2.50, "category": "Bebidas"},
    {"name": "Limonada",         "price":  2.25, "category": "Bebidas"},
    {"name": "Tiramisú",         "price":  6.00, "category": "Postres"},
    {"name": "Helado de Vainilla","price": 4.00, "category": "Postres"},
    {"name": "Brownie",          "price":  5.00, "category": "Postres"},
]


def main():
    print(f"\n{BLUE}── Seeding Odoo POS ──────────────────────────{RESET}")
    inf(f"URL: {ODOO_URL} | DB: {ODOO_DB}")

    common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
    if not uid:
        err("Auth failed — check credentials"); sys.exit(1)
    ok(f"Authenticated as UID={uid}")

    models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")

    # ── Categories ────────────────────────────────────────────────────────
    cat_ids: dict[str, int] = {}
    for cat in CATEGORIES:
        existing = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            "pos.category", "search",
            [[["name", "=", cat["name"]]]]
        )
        if existing:
            cat_ids[cat["name"]] = existing[0]
            inf(f"Category '{cat['name']}' already exists (id={existing[0]})")
        else:
            cid = models.execute_kw(
                ODOO_DB, uid, ODOO_PASSWORD,
                "pos.category", "create",
                [{"name": cat["name"], "sequence": cat["sequence"]}]
            )
            cat_ids[cat["name"]] = cid
            ok(f"Created category '{cat['name']}' (id={cid})")

    # ── Products ──────────────────────────────────────────────────────────
    created = 0
    for prod in PRODUCTS:
        existing = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            "product.template", "search",
            [[["name", "=", prod["name"]]]]
        )
        if existing:
            inf(f"Product '{prod['name']}' already exists — skipping")
            continue

        tmpl_id = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            "product.template", "create",
            [{
                "name": prod["name"],
                "list_price": prod["price"],
                "available_in_pos": True,
                "pos_category_id": cat_ids[prod["category"]],
                "type": "consu",
            }]
        )
        ok(f"Created product '{prod['name']}' (tmpl_id={tmpl_id})")
        created += 1

    print(f"\n{GREEN}Done.{RESET} {created}/{len(PRODUCTS)} products created.\n")


if __name__ == "__main__":
    main()
