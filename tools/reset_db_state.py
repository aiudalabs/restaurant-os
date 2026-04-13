#!/usr/bin/env python3
"""
Reset DB state: deletes all orders and order_items, frees all tables.

Uses gcloud auth token (no service account file needed).

Usage:
  python3 tools/reset_db_state.py            # dry-run: lists what would change
  python3 tools/reset_db_state.py --yes      # actually performs the reset
"""

import json
import subprocess
import sys
import urllib.request
import urllib.error

PROJECT_ID = "restaurant-os-68c79"
FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
RTDB_BASE = f"https://{PROJECT_ID}-default-rtdb.firebaseio.com"


def get_token():
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True, text=True
    )
    return result.stdout.strip()


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
    docs = []
    page_token = None
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
    status, data = http("DELETE", url, token)
    return status == 200, data


def free_table(doc_name, token):
    """PATCH table doc: set currentOrderId = null."""
    url = f"https://firestore.googleapis.com/v1/{doc_name}?updateMask.fieldPaths=currentOrderId"
    body = {"fields": {"currentOrderId": {"nullValue": None}}}
    status, data = http("PATCH", url, token, body)
    return status == 200, data


def clear_rtdb_order_items(token):
    url = f"{RTDB_BASE}/order_items.json?access_token={token}"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200, resp.read().decode()
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:200]}"


def main():
    apply = "--yes" in sys.argv
    mode = "APPLY" if apply else "DRY-RUN"

    print("=" * 60)
    print(f"RESET DB STATE — project={PROJECT_ID} — mode={mode}")
    print("=" * 60)

    token = get_token()
    if not token:
        print("ERROR: No gcloud token. Run: gcloud auth login")
        sys.exit(1)

    orders = list_all("orders", token)
    items = list_all("order_items", token)
    tables = list_all("tables", token)

    print(f"  orders found:      {len(orders)}")
    print(f"  order_items found: {len(items)}")
    print(f"  tables found:      {len(tables)}")
    occupied = [
        t for t in tables
        if t.get("fields", {}).get("currentOrderId", {}).get("stringValue")
    ]
    print(f"  tables occupied:   {len(occupied)}")
    print()

    if not apply:
        print("DRY-RUN complete. Re-run with --yes to apply.")
        return

    print("--- deleting order_items ---")
    ok_i = 0
    for d in items:
        ok, _ = delete_doc(d["name"], token)
        ok_i += 1 if ok else 0
    print(f"  {ok_i}/{len(items)} deleted")

    print("--- deleting orders ---")
    ok_o = 0
    for d in orders:
        ok, _ = delete_doc(d["name"], token)
        ok_o += 1 if ok else 0
    print(f"  {ok_o}/{len(orders)} deleted")

    print("--- freeing tables (currentOrderId = null) ---")
    ok_t = 0
    for d in tables:
        ok, err = free_table(d["name"], token)
        if ok:
            ok_t += 1
        else:
            print(f"  ! {d['name'].split('/')[-1]}: {err}")
    print(f"  {ok_t}/{len(tables)} freed")

    print("--- clearing RTDB /order_items ---")
    ok, msg = clear_rtdb_order_items(token)
    print(f"  {'OK' if ok else 'FAIL'}: {msg}")

    print()
    print("Reset complete.")


if __name__ == "__main__":
    main()
