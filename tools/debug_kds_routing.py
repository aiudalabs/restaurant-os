#!/usr/bin/env python3
"""
Debug KDS routing: dumps stations, categories, products, and recent order_items
to diagnose why items aren't being routed to stations.

Uses gcloud auth token (no service account file needed).

Usage:
  python3 tools/debug_kds_routing.py
"""

import json
import subprocess
import urllib.request
import urllib.error

PROJECT_ID = "restaurant-os-68c79"
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"


def get_token():
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True, text=True
    )
    return result.stdout.strip()


def firestore_list(collection, token, page_size=100):
    """List all documents in a top-level collection."""
    url = f"{BASE_URL}/{collection}?pageSize={page_size}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return data.get("documents", [])
    except urllib.error.HTTPError as e:
        print(f"  ERROR listing {collection}: HTTP {e.code}")
        print(f"  {e.read().decode()[:500]}")
        return []


def parse_value(v):
    """Extract Python value from Firestore REST value."""
    if "stringValue" in v:
        return v["stringValue"]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return v["doubleValue"]
    if "booleanValue" in v:
        return v["booleanValue"]
    if "nullValue" in v:
        return None
    if "arrayValue" in v:
        return [parse_value(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v:
        return {k: parse_value(val) for k, val in v["mapValue"].get("fields", {}).items()}
    if "timestampValue" in v:
        return v["timestampValue"]
    return str(v)


def parse_doc(doc):
    """Convert Firestore REST document to simple dict."""
    name = doc.get("name", "")
    doc_id = name.split("/")[-1] if name else "?"
    fields = doc.get("fields", {})
    result = {"_id": doc_id}
    for k, v in fields.items():
        result[k] = parse_value(v)
    return result


def main():
    token = get_token()
    if not token:
        print("ERROR: No gcloud token. Run: gcloud auth login")
        return

    # 1. Stations
    print("=" * 60)
    print("STATIONS")
    print("=" * 60)
    stations = [parse_doc(d) for d in firestore_list("stations", token)]
    for s in stations:
        print(f"  ID: {s['_id']}")
        print(f"    name: {s.get('name')}")
        print(f"    branchId: {s.get('branchId')}")
        print(f"    orgId: {s.get('orgId')}")
        print(f"    isActive: {s.get('isActive')}")
        print(f"    categoryIds: {s.get('categoryIds', [])}")
        print()

    # 2. Categories
    print("=" * 60)
    print("CATEGORIES")
    print("=" * 60)
    categories = [parse_doc(d) for d in firestore_list("categories", token)]
    cat_map = {}
    for c in categories:
        cat_map[c["_id"]] = c.get("name", "?")
        print(f"  ID: {c['_id']}  name: {c.get('name')}  menuId: {c.get('menuId')}")
    print()

    # 3. Products (just a few fields)
    print("=" * 60)
    print("PRODUCTS (categoryId mapping)")
    print("=" * 60)
    products = [parse_doc(d) for d in firestore_list("products", token)]
    for p in products:
        cat_name = cat_map.get(p.get("categoryId"), "UNKNOWN")
        print(f"  ID: {p['_id']}  name: {p.get('name')}  categoryId: {p.get('categoryId')} ({cat_name})")
    print()

    # 4. Recent order_items
    print("=" * 60)
    print("RECENT ORDER_ITEMS (last 10)")
    print("=" * 60)
    items = [parse_doc(d) for d in firestore_list("order_items", token)]
    items.sort(key=lambda x: x.get("sentToStationAt", ""), reverse=True)
    for item in items[:10]:
        print(f"  ID: {item['_id']}")
        print(f"    orderId: {item.get('orderId')}")
        print(f"    productName: {item.get('productName')}")
        print(f"    categoryId: {item.get('categoryId')} ({cat_map.get(item.get('categoryId'), 'UNKNOWN')})")
        print(f"    stationId: '{item.get('stationId')}'")
        print(f"    status: {item.get('status')}")
        print()

    # 5. Users (operators)
    print("=" * 60)
    print("USERS")
    print("=" * 60)
    users = [parse_doc(d) for d in firestore_list("users", token)]
    for u in users:
        print(f"  ID: {u['_id']}")
        print(f"    email: {u.get('email')}")
        print(f"    role: {u.get('role')}")
        print(f"    stationId: '{u.get('stationId')}'")
        print(f"    orgId: {u.get('orgId')}")
        print(f"    branchIds: {u.get('branchIds')}")
        print()

    # 6. Diagnosis
    print("=" * 60)
    print("DIAGNOSIS")
    print("=" * 60)

    # Check: do stations have categoryIds that match product categories?
    station_cat_ids = set()
    for s in stations:
        for cid in s.get("categoryIds", []):
            station_cat_ids.add(cid)

    product_cat_ids = set()
    for p in products:
        if p.get("categoryId"):
            product_cat_ids.add(p["categoryId"])

    missing = product_cat_ids - station_cat_ids
    if missing:
        print(f"  PROBLEM: These product categoryIds are NOT in any station's categoryIds:")
        for cid in missing:
            print(f"    - {cid} ({cat_map.get(cid, 'UNKNOWN')})")
        print(f"  FIX: Add these categoryIds to the appropriate station.")
    else:
        print(f"  OK: All product categoryIds are covered by stations.")

    # Check: do order_items have stationId assigned?
    unrouted = [i for i in items if not i.get("stationId")]
    if unrouted:
        print(f"  PROBLEM: {len(unrouted)} order_items have empty stationId (not routed)")

    # Check: do operators have matching stationId?
    operators = [u for u in users if u.get("role") == "operator"]
    for op in operators:
        op_station = op.get("stationId")
        if not op_station:
            print(f"  PROBLEM: Operator {op.get('email')} has no stationId")
        else:
            matching_station = [s for s in stations if s["_id"] == op_station]
            if not matching_station:
                print(f"  PROBLEM: Operator {op.get('email')} has stationId '{op_station}' but no station with that ID exists")
            else:
                print(f"  OK: Operator {op.get('email')} -> station '{matching_station[0].get('name')}'")


if __name__ == "__main__":
    main()
