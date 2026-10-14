#!/usr/bin/env python3
"""
Seed a fictitious restaurant for the Zaveli integration test (issue #59).

Creates (or overwrites, same fixed IDs every run) one organization, one branch,
one menu, two categories and five products. No stations: items are counter
items (see AGENTS.md, counter mode). Never touches other organizations.

Usage:
  ROS_PROJECT=restaurant-os-dev-49096 python3 tools/seed_zaveli_demo.py          # dry-run
  ROS_PROJECT=restaurant-os-dev-49096 python3 tools/seed_zaveli_demo.py --yes    # apply

Refuses to run against prod.
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

PROJECT_ID = os.environ.get("ROS_PROJECT") or sys.exit(
    "Define ROS_PROJECT=restaurant-os-dev-49096. Ver docs/ENVIRONMENTS.md"
)
if PROJECT_ID == "restaurant-os-68c79":
    sys.exit("Este seed es solo para dev: datos ficticios de la prueba de Zaveli.")

ORG_ID = "zaveli-demo-org"
BRANCH_ID = "zaveli-demo-branch"
MENU_ID = "zaveli-demo-menu"
TAX_PERCENT = 0.07

FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

CATEGORIES = [
    {"id": "zaveli-demo-cat-platos", "name": "Platos", "sortOrder": 0},
    {"id": "zaveli-demo-cat-bebidas", "name": "Bebidas", "sortOrder": 1},
]

PRODUCTS = [
    {"id": "zaveli-demo-pizza", "name": "Pizza margarita", "price": 8.50, "categoryId": "zaveli-demo-cat-platos"},
    {"id": "zaveli-demo-pasta", "name": "Pasta boloñesa", "price": 9.25, "categoryId": "zaveli-demo-cat-platos"},
    {"id": "zaveli-demo-empanadas", "name": "Empanadas (3)", "price": 4.00, "categoryId": "zaveli-demo-cat-platos"},
    {"id": "zaveli-demo-refresco", "name": "Refresco", "price": 1.75, "categoryId": "zaveli-demo-cat-bebidas"},
    {"id": "zaveli-demo-limonada", "name": "Limonada", "price": 2.25, "categoryId": "zaveli-demo-cat-bebidas"},
]


def get_token() -> str:
    # Application Default Credentials: the account with access to the dev project
    # (gcloud auth application-default login), billed to that project.
    r = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                       capture_output=True, text=True)
    return r.stdout.strip()


def to_value(value):
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, datetime):
        return {"timestampValue": value.isoformat().replace("+00:00", "Z")}
    if isinstance(value, list):
        return {"arrayValue": {"values": [to_value(v) for v in value]}}
    if isinstance(value, dict):
        return {"mapValue": {"fields": {k: to_value(v) for k, v in value.items()}}}
    return {"stringValue": str(value)}


def put_doc(collection: str, doc_id: str, data: dict, token: str) -> int:
    """PATCH without updateMask replaces the whole document (creates it if missing)."""
    url = f"{FIRESTORE_BASE}/{collection}/{doc_id}"
    body = json.dumps({"fields": {k: to_value(v) for k, v in data.items()}}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "x-goog-user-project": PROJECT_ID,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"  ERROR {collection}/{doc_id}: {e.code} {e.read().decode()[:300]}")
        return e.code


def documents() -> list[tuple[str, str, dict]]:
    now = datetime.now(timezone.utc)
    docs: list[tuple[str, str, dict]] = [
        ("organizations", ORG_ID, {
            "id": ORG_ID, "name": "Restaurante Ficticio Zaveli", "slug": "zaveli-demo",
            "plan": "starter", "defaultCurrency": "USD", "defaultTaxPercent": TAX_PERCENT,
            "defaultTipOptions": [0.10, 0.15], "timezone": "America/Panama",
            "isActive": True, "createdAt": now, "ownerId": "",
        }),
        ("branches", BRANCH_ID, {
            "id": BRANCH_ID, "orgId": ORG_ID, "name": "Ficticio Centro",
            "address": "Calle Ficticia 1, Ciudad de Panamá", "menuId": MENU_ID,
            "taxPercent": TAX_PERCENT, "isActive": True, "allowPayAtPickup": True,
            "businessHours": {}, "createdAt": now,
        }),
        ("menus", MENU_ID, {
            "id": MENU_ID, "orgId": ORG_ID, "name": "Menú principal", "isActive": True, "createdAt": now,
        }),
    ]
    for cat in CATEGORIES:
        docs.append(("categories", cat["id"], {
            "id": cat["id"], "orgId": ORG_ID, "menuId": MENU_ID, "name": cat["name"],
            "sortOrder": cat["sortOrder"], "isActive": True,
        }))
    for order, prod in enumerate(PRODUCTS):
        docs.append(("products", prod["id"], {
            "id": prod["id"], "orgId": ORG_ID, "menuId": MENU_ID, "categoryId": prod["categoryId"],
            "name": prod["name"], "description": "", "price": prod["price"], "isActive": True,
            "sortOrder": order, "tags": [], "modifierGroups": [],
        }))
    return docs


def main() -> None:
    apply = "--yes" in sys.argv
    docs = documents()
    print(f"Proyecto: {PROJECT_ID} — {len(docs)} documentos ({'aplicando' if apply else 'dry-run'})")
    for collection, doc_id, _ in docs:
        print(f"  {collection}/{doc_id}")
    if not apply:
        print("Dry-run. Repite con --yes para escribir.")
        return
    token = get_token()
    failed = [d for d in docs if put_doc(d[0], d[1], d[2], token) != 200]
    if failed:
        sys.exit(f"{len(failed)} documentos fallaron.")
    print("Listo.")


if __name__ == "__main__":
    main()
