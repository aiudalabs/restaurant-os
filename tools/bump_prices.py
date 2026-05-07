#!/usr/bin/env python3
"""
Bump product prices by category.

Default rule:
  - Categorías cuyo nombre contiene 'cerveza', 'bebida', 'vino', 'cocktail',
    'coctel', 'trago' → DRINK_PCT (default 10%).
  - Resto (pizzas, comida, sodas, postres, …) → FOOD_PCT (default 7%).

Prices are rounded to 2 decimals.

Usage:
  python3 tools/bump_prices.py                     # dry-run
  python3 tools/bump_prices.py --yes               # apply
  python3 tools/bump_prices.py --food-pct 5 --drink-pct 8 --yes
  python3 tools/bump_prices.py --menu <menuId> --yes
"""

import argparse
import json
import subprocess
import sys
import urllib.request
import urllib.error

PROJECT_ID = "restaurant-os-68c79"
DEFAULT_MENU_ID = "oGd13kHc3YA0Q1Bmn3Zr"   # Boda Lucas
FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

DRINK_KEYWORDS = ("cerveza", "bebida", "vino", "cocktail", "coctel", "trago")


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


def parse_value(v):
    if "stringValue" in v:    return v["stringValue"]
    if "integerValue" in v:   return int(v["integerValue"])
    if "doubleValue" in v:    return v["doubleValue"]
    if "booleanValue" in v:   return v["booleanValue"]
    if "nullValue" in v:      return None
    return None


def parse_doc(doc):
    name = doc.get("name", "")
    out = {"_id": name.split("/")[-1] if name else "?", "_name": name}
    for k, v in doc.get("fields", {}).items():
        out[k] = parse_value(v)
    return out


def list_all(collection, token):
    docs, page_token = [], None
    while True:
        url = f"{FIRESTORE_BASE}/{collection}?pageSize=300"
        if page_token:
            url += f"&pageToken={page_token}"
        st, data = http("GET", url, token)
        if st != 200:
            sys.exit(f"ERROR listing {collection}: {data}")
        docs.extend(data.get("documents", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return docs


def patch_price(doc_name, new_price, token):
    url = f"https://firestore.googleapis.com/v1/{doc_name}?updateMask.fieldPaths=price"
    body = {"fields": {"price": {"doubleValue": float(new_price)}}}
    return http("PATCH", url, token, body)


def is_drink_category(cat_name):
    if not cat_name: return False
    n = cat_name.lower()
    return any(kw in n for kw in DRINK_KEYWORDS)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--menu", default=DEFAULT_MENU_ID)
    p.add_argument("--food-pct",  type=float, default=7.0)
    p.add_argument("--drink-pct", type=float, default=10.0)
    p.add_argument("--yes", action="store_true")
    args = p.parse_args()

    food_mult  = 1 + args.food_pct  / 100.0
    drink_mult = 1 + args.drink_pct / 100.0

    print("=" * 60)
    print(f"BUMP PRICES — menu={args.menu} — mode={'APPLY' if args.yes else 'DRY-RUN'}")
    print(f"  food : +{args.food_pct:.2f}%   drink: +{args.drink_pct:.2f}%")
    print("=" * 60)

    token = get_token()
    if not token: sys.exit("ERROR: gcloud token missing.")

    cats = [parse_doc(d) for d in list_all("categories", token)]
    cats = [c for c in cats if c.get("menuId") == args.menu]
    cat_map = {c["_id"]: c.get("name", "?") for c in cats}
    if not cats:
        sys.exit(f"No categories for menu {args.menu}")

    products = [parse_doc(d) for d in list_all("products", token)]
    products = [p for p in products if p.get("menuId") == args.menu]
    if not products:
        sys.exit(f"No products for menu {args.menu}")

    print(f"  {len(cats)} categories, {len(products)} products in menu")
    print()

    plan = []
    for prod in products:
        cat_name = cat_map.get(prod.get("categoryId"), "(sin cat)")
        is_drink = is_drink_category(cat_name)
        mult = drink_mult if is_drink else food_mult
        old  = float(prod.get("price", 0) or 0)
        new  = round(old * mult, 2)
        plan.append((prod, cat_name, is_drink, old, new))

    name_w = max(len(p["name"]) for p in products)
    cat_w  = max(len(c) for c in cat_map.values())
    print(f"  {'Producto':<{name_w}}  {'Categoría':<{cat_w}}  Tipo    Antes      Después   Δ")
    print(f"  {'-'*name_w}  {'-'*cat_w}  ------  ---------  --------  -----")
    for prod, cat_name, is_drink, old, new in plan:
        kind = "DRINK" if is_drink else "FOOD"
        delta = new - old
        print(f"  {prod['name']:<{name_w}}  {cat_name:<{cat_w}}  {kind:<6}  ${old:>7.2f}   ${new:>6.2f}   +${delta:.2f}")
    print()

    if not args.yes:
        print("DRY-RUN complete. Re-run with --yes to apply.")
        return

    print("--- applying ---")
    ok = 0
    for prod, _, _, _, new in plan:
        st, data = patch_price(prod["_name"], new, token)
        if st == 200:
            ok += 1
        else:
            print(f"  FAIL {prod['name']}: {data}")
    print(f"  {ok}/{len(plan)} updated")


if __name__ == "__main__":
    main()
