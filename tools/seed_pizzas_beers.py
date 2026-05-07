#!/usr/bin/env python3
"""
Wipe menu + orders and seed with just 2 pizzas and 2 beers.

- Deletes all orders, order_items, products, categories.
- Frees all tables (currentOrderId = null) and clears RTDB /order_items.
- Creates 2 new categories (Pizzas, Cervezas) under the existing menu.
- Creates 4 products with Wikimedia image URLs.
- Updates stations: Cocina -> [Pizzas], Bar -> [Cervezas].

Usage:
  python3 tools/seed_pizzas_beers.py          # dry-run
  python3 tools/seed_pizzas_beers.py --yes    # apply
"""

import json
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

PROJECT_ID   = "restaurant-os-68c79"
ORG_ID       = "demo-org"
BRANCH_ID    = "demo-branch"
MENU_ID      = "oGd13kHc3YA0Q1Bmn3Zr"   # Boda Lucas
STATION_COCINA = "gbUhWqXddBgQfW7ZzrHN"
STATION_BAR    = "F4AnJBJ2qmIuvDMN4l0G"

FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
RTDB_BASE      = f"https://{PROJECT_ID}-default-rtdb.firebaseio.com"

CATEGORIES = [
    {"key": "pizzas",   "name": "Pizzas",   "sortOrder": 0},
    {"key": "cervezas", "name": "Cervezas", "sortOrder": 1},
]

PRODUCTS = [
    {
        "name": "Pizza Pepperoni",
        "description": "Pizza con salsa de tomate, mozzarella y pepperoni.",
        "price": 12.00,
        "category_key": "pizzas",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/d/d1/Pepperoni_pizza.jpg",
        "sortOrder": 0,
        "preparationMinutes": 15,
    },
    {
        "name": "Pizza Queso",
        "description": "Pizza clásica de mozzarella.",
        "price": 10.00,
        "category_key": "pizzas",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/5/51/Cheese_Pizza.jpg",
        "sortOrder": 1,
        "preparationMinutes": 15,
    },
    {
        "name": "Cerveza Panamá",
        "description": "Cerveza pilsner panameña 355 ml.",
        "price": 2.50,
        "category_key": "cervezas",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/2/28/Cerveza_Panama.jpg",
        "sortOrder": 0,
        "preparationMinutes": 1,
    },
    {
        "name": "Cerveza Balboa",
        "description": "Cerveza pale lager panameña 355 ml.",
        "price": 2.50,
        "category_key": "cervezas",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/4/45/Botella_de_Cerveza_Balboa.jpg",
        "sortOrder": 1,
        "preparationMinutes": 1,
    },
]


def get_token():
    r = subprocess.run(["gcloud", "auth", "print-access-token"],
                       capture_output=True, text=True)
    return r.stdout.strip()


def http(method, url, token, body=None):
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:500]}


def list_all(collection, token):
    docs, page_token = [], None
    while True:
        url = f"{FIRESTORE_BASE}/{collection}?pageSize=300"
        if page_token:
            url += f"&pageToken={page_token}"
        status, data = http("GET", url, token)
        if status != 200:
            print(f"  ERROR listing {collection}: {data}")
            return docs
        docs.extend(data.get("documents", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return docs


def delete_doc(doc_name, token):
    url = f"https://firestore.googleapis.com/v1/{doc_name}"
    status, _ = http("DELETE", url, token)
    return status == 200


def patch_doc(doc_name, fields_mask, body, token):
    mask = "&".join(f"updateMask.fieldPaths={f}" for f in fields_mask)
    url = f"https://firestore.googleapis.com/v1/{doc_name}?{mask}"
    return http("PATCH", url, token, body)


def create_doc(collection, body, token):
    """POST to collection; returns (id, full_doc_name)."""
    url = f"{FIRESTORE_BASE}/{collection}"
    status, data = http("POST", url, token, body)
    if status != 200:
        print(f"  ERROR creating doc in {collection}: {data}")
        return None, None
    name = data.get("name", "")
    return name.split("/")[-1], name


def sv_string(s): return {"stringValue": s}
def sv_double(n): return {"doubleValue": float(n)}
def sv_int(n):    return {"integerValue": str(int(n))}
def sv_bool(b):   return {"booleanValue": bool(b)}
def sv_array(xs): return {"arrayValue": {"values": xs}}
def sv_null():    return {"nullValue": None}
def sv_ts(dt):    return {"timestampValue": dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")}


def clear_rtdb_order_items(token):
    url = f"{RTDB_BASE}/order_items.json?access_token={token}"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200
    except urllib.error.HTTPError:
        return False


def build_category_fields(name, sort_order):
    return {"fields": {
        "orgId":     sv_string(ORG_ID),
        "menuId":    sv_string(MENU_ID),
        "name":      sv_string(name),
        "sortOrder": sv_int(sort_order),
        "isActive":  sv_bool(True),
    }}


def build_product_fields(p, category_id):
    return {"fields": {
        "orgId":               sv_string(ORG_ID),
        "menuId":              sv_string(MENU_ID),
        "categoryId":          sv_string(category_id),
        "name":                sv_string(p["name"]),
        "description":         sv_string(p["description"]),
        "imageUrl":            sv_string(p["imageUrl"]),
        "price":               sv_double(p["price"]),
        "isActive":            sv_bool(True),
        "sortOrder":           sv_int(p["sortOrder"]),
        "tags":                sv_array([]),
        "modifierGroups":      sv_array([]),
        "preparationMinutes":  sv_int(p["preparationMinutes"]),
    }}


def main():
    apply = "--yes" in sys.argv
    mode = "APPLY" if apply else "DRY-RUN"
    print("=" * 60)
    print(f"SEED PIZZAS + BEERS — project={PROJECT_ID} — mode={mode}")
    print("=" * 60)

    token = get_token()
    if not token:
        print("ERROR: No gcloud token. Run: gcloud auth login"); sys.exit(1)

    orders     = list_all("orders", token)
    items      = list_all("order_items", token)
    products   = list_all("products", token)
    categories = list_all("categories", token)
    tables     = list_all("tables", token)
    stations   = list_all("stations", token)

    print(f"  orders     : {len(orders)}")
    print(f"  order_items: {len(items)}")
    print(f"  products   : {len(products)}")
    print(f"  categories : {len(categories)}")
    print(f"  tables     : {len(tables)}")
    print(f"  stations   : {len(stations)}")
    print()
    print("Will create:")
    for c in CATEGORIES:  print(f"  + category {c['name']}")
    for p in PRODUCTS:    print(f"  + product  {p['name']} ({p['category_key']}) — ${p['price']:.2f}")
    print()

    if not apply:
        print("DRY-RUN complete. Re-run with --yes to apply.")
        return

    print("--- deleting order_items ---")
    for d in items: delete_doc(d["name"], token)
    print(f"  {len(items)} deleted")

    print("--- deleting orders ---")
    for d in orders: delete_doc(d["name"], token)
    print(f"  {len(orders)} deleted")

    print("--- deleting products ---")
    for d in products: delete_doc(d["name"], token)
    print(f"  {len(products)} deleted")

    print("--- deleting categories ---")
    for d in categories: delete_doc(d["name"], token)
    print(f"  {len(categories)} deleted")

    print("--- freeing tables ---")
    free_body = {"fields": {"currentOrderId": sv_null()}}
    ok_t = 0
    for d in tables:
        status, _ = patch_doc(d["name"], ["currentOrderId"], free_body, token)
        if status == 200: ok_t += 1
    print(f"  {ok_t}/{len(tables)} freed")

    print("--- clearing RTDB /order_items ---")
    print(f"  {'OK' if clear_rtdb_order_items(token) else 'FAIL'}")

    print("--- creating categories ---")
    cat_ids = {}
    for c in CATEGORIES:
        cid, _ = create_doc("categories",
                            build_category_fields(c["name"], c["sortOrder"]),
                            token)
        if not cid:
            print(f"  FAIL creating {c['name']}"); sys.exit(1)
        cat_ids[c["key"]] = cid
        print(f"  + {c['name']} -> {cid}")

    print("--- creating products ---")
    for p in PRODUCTS:
        pid, _ = create_doc("products",
                            build_product_fields(p, cat_ids[p["category_key"]]),
                            token)
        if not pid:
            print(f"  FAIL creating {p['name']}"); sys.exit(1)
        print(f"  + {p['name']} -> {pid}")

    print("--- updating stations ---")
    for s in stations:
        sid = s["name"].split("/")[-1]
        if sid == STATION_COCINA:
            new_cats = [cat_ids["pizzas"], cat_ids["cervezas"]]
        elif sid == STATION_BAR:
            new_cats = []
        else:
            continue
        body = {"fields": {"categoryIds": sv_array([sv_string(c) for c in new_cats])}}
        status, data = patch_doc(s["name"], ["categoryIds"], body, token)
        ok = status == 200
        print(f"  {'OK' if ok else 'FAIL'} {s.get('fields', {}).get('name', {}).get('stringValue')} -> {new_cats}")
        if not ok: print(f"    {data}")

    print()
    print("Seed complete.")


if __name__ == "__main__":
    main()
