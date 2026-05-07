#!/usr/bin/env python3
"""
seed_firebase.py — Crea la org, branch, menu y stations de demo en Firestore.

Uso:
  cd apps/fastapi_bff
  python scripts/seed_firebase.py
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

import firebase_admin
from firebase_admin import credentials, firestore

GREEN = "\033[92m"; RED = "\033[91m"; BLUE = "\033[94m"; RESET = "\033[0m"
ok  = lambda m: print(f"  {GREEN}✓{RESET} {m}")
err = lambda m: print(f"  {RED}✗{RESET} {m}")
inf = lambda m: print(f"  {BLUE}→{RESET} {m}")

CRED_PATH    = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./serviceAccountKey.json")
PROJECT_ID   = os.getenv("FIREBASE_PROJECT_ID", "")
ORG_ID       = os.getenv("ORG_ID",    "org_demo_001")
BRANCH_ID    = os.getenv("BRANCH_ID", "branch_main_001")
MENU_ID      = "menu_main_001"

NOW = datetime.now(timezone.utc)


def init_firebase():
    if os.path.exists(CRED_PATH):
        cred = credentials.Certificate(CRED_PATH)
        return firebase_admin.initialize_app(cred, {"projectId": PROJECT_ID})
    return firebase_admin.initialize_app(options={"projectId": PROJECT_ID})


def upsert(db, collection: str, doc_id: str, data: dict):
    ref = db.collection(collection).document(doc_id)
    ref.set(data, merge=True)
    return ref


def main():
    print(f"\n{BLUE}── Seeding Firebase ──────────────────────────{RESET}")
    inf(f"Project: {PROJECT_ID or '(from ADC)'} | Org: {ORG_ID} | Branch: {BRANCH_ID}")

    init_firebase()
    db = firestore.client()

    # ── Organization ──────────────────────────────────────────────────────
    upsert(db, "organizations", ORG_ID, {
        "name": "RestaurantOS Demo",
        "slug": "restaurantos-demo",
        "plan": "growth",
        "defaultCurrency": "USD",
        "defaultTaxPercent": 0.07,
        "defaultTipOptions": [0.10, 0.15, 0.20],
        "timezone": "America/Panama",
        "isActive": True,
        "createdAt": NOW,
        "ownerId": "",
    })
    ok(f"Organization '{ORG_ID}' upserted")

    # ── Menu ──────────────────────────────────────────────────────────────
    upsert(db, "menus", MENU_ID, {
        "orgId": ORG_ID,
        "name": "Menú Principal",
        "isActive": True,
        "createdAt": NOW,
    })
    ok(f"Menu '{MENU_ID}' upserted")

    # ── Branch ────────────────────────────────────────────────────────────
    upsert(db, "branches", BRANCH_ID, {
        "orgId": ORG_ID,
        "name": "Sucursal Principal",
        "address": "Ciudad de Panamá",
        "phone": "+507-000-0000",
        "menuId": MENU_ID,
        "taxPercent": 0.07,
        "isActive": True,
        "businessHours": {},
        "createdAt": NOW,
    })
    ok(f"Branch '{BRANCH_ID}' upserted")

    # ── Stations ──────────────────────────────────────────────────────────
    # Category IDs will be set after sync-catalog fills them in.
    # We seed with empty categoryIds — the admin sets them post-sync.
    stations = [
        {
            "id": "station_kitchen_001",
            "name": "Cocina",
            "color": "#FF5722",
            "categoryIds": [],
        },
        {
            "id": "station_bar_001",
            "name": "Bar",
            "color": "#2196F3",
            "categoryIds": [],
        },
    ]
    for s in stations:
        sid = s.pop("id")
        upsert(db, "stations", sid, {
            **s,
            "orgId": ORG_ID,
            "branchId": BRANCH_ID,
            "fcmTokens": [],
            "isActive": True,
        })
        ok(f"Station '{s['name']}' upserted (id={sid})")

    # ── Demo table ────────────────────────────────────────────────────────
    upsert(db, "tables", "table_001", {
        "orgId": ORG_ID,
        "branchId": BRANCH_ID,
        "number": "1",
        "zone": "Salón",
        "capacity": 4,
        "qrData": f"https://restaurantos.app/menu?org={ORG_ID}&branch={BRANCH_ID}&table=table_001",
        "isActive": True,
        "currentOrderId": None,
    })
    ok("Demo table '1' upserted")

    print(f"\n{GREEN}Firebase seed complete.{RESET}")
    print(f"  Next: POST /admin/sync-catalog to populate products from Odoo.\n")


if __name__ == "__main__":
    main()
