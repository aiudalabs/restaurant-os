#!/usr/bin/env python3
"""Demo catalog for the electronic-invoice flow (issue #68). DEV ONLY.

Seeds, for an existing org/branch/menu, two categories, four products (one
ITBMS-exempt) and a "Cocina" station routing the pizzas; drinks stay in counter
mode (the waiter marks them ready). Idempotent (fixed document ids).

  ROS_PROJECT=restaurant-os-dev-49096 python3 tools/seed_fiscal_demo.py \
      --org 07OfcB2trnuJlb7XBIZn --branch rnYMQIjihcRQYFwCmPND --menu 06o396ADocn4MmW4jxkw

Fiscal data of the org / branch and the Digifact credentials are set from the
admin (Facturación / Sucursales), not here.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT_ID = os.environ.get("ROS_PROJECT") or sys.exit(
    "Define ROS_PROJECT: restaurant-os-dev-49096 (dev). Ver docs/ENVIRONMENTS.md"
)
if PROJECT_ID != "restaurant-os-dev-49096":
    sys.exit("Este seed es solo para dev.")
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"


def token():
    return subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True).stdout.strip()


def enc(v):
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    if isinstance(v, list):
        return {"arrayValue": {"values": [enc(x) for x in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {k: enc(x) for k, x in v.items()}}}
    return {"stringValue": str(v)}


def put(tok, path, fields):
    req = urllib.request.Request(
        f"{BASE}/{path}",
        data=json.dumps({"fields": {k: enc(v) for k, v in fields.items()}}).encode(),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return f"{e.code} {e.read().decode()[:200]}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--org", required=True)
    ap.add_argument("--branch", required=True)
    ap.add_argument("--menu", required=True)
    a = ap.parse_args()
    tok = token()
    cats = {
        "fiscal-demo-pizzas": {"name": "Pizzas", "sortOrder": 1},
        "fiscal-demo-bebidas": {"name": "Bebidas", "sortOrder": 2},
    }
    for cid, c in cats.items():
        print("category", cid, put(tok, f"categories/{cid}", {"id": cid, "orgId": a.org, "menuId": a.menu, "isActive": True, **c}))
    products = {
        "fiscal-demo-margarita": {"name": "Pizza Margarita", "price": 10.0, "categoryId": "fiscal-demo-pizzas", "sortOrder": 1,
                                  "description": "Tomate, mozzarella y albahaca"},
        "fiscal-demo-pepperoni": {"name": "Pizza Pepperoni", "price": 12.5, "categoryId": "fiscal-demo-pizzas", "sortOrder": 2,
                                  "description": "Con pepperoni"},
        "fiscal-demo-soda": {"name": "Soda", "price": 1.5, "categoryId": "fiscal-demo-bebidas", "sortOrder": 1},
        "fiscal-demo-agua": {"name": "Agua", "price": 1.0, "categoryId": "fiscal-demo-bebidas", "sortOrder": 2,
                             "fiscal": {"taxCode": "00"}},
    }
    for pid, p in products.items():
        print("product", pid, put(tok, f"products/{pid}", {"id": pid, "orgId": a.org, "menuId": a.menu, "isActive": True,
                                                          "tags": [], "modifierGroups": [], **p}))
    print("station", put(tok, "stations/fiscal-demo-cocina", {
        "id": "fiscal-demo-cocina", "orgId": a.org, "branchId": a.branch, "name": "Cocina",
        "categoryIds": ["fiscal-demo-pizzas"], "fcmTokens": [], "color": "#FF5722", "isActive": True,
    }))


if __name__ == "__main__":
    main()
