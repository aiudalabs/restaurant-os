#!/usr/bin/env python3
"""Move per-org credentials off the organization document.

organizations/{orgId}.odooUrl/odooDb/odooUser/odooPassword  →
organizations/{orgId}/private/odoo (server-only; firestore.rules denies clients).

Dry run by default; pass --apply to write. Uses the gcloud access token.

  ROS_PROJECT=restaurant-os-dev-49096 python3 tools/migrate_org_private.py [--apply]
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT_ID = os.environ.get("ROS_PROJECT") or sys.exit(
    "Define ROS_PROJECT: restaurant-os-68c79 (prod) o restaurant-os-dev-49096 (dev). Ver docs/ENVIRONMENTS.md"
)
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
FIELDS = ["odooUrl", "odooDb", "odooUser", "odooPassword"]


def token():
    return subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True).stdout.strip()


def http(method, url, tok, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}


def main():
    apply = "--apply" in sys.argv
    tok = token()
    status, data = http("GET", f"{BASE}/organizations?pageSize=300", tok)
    if status != 200:
        sys.exit(f"No pude listar organizations: {data}")
    moved = 0
    for doc in data.get("documents", []):
        org_id = doc["name"].split("/")[-1]
        fields = doc.get("fields", {})
        creds = {f: fields[f]["stringValue"] for f in FIELDS if f in fields and "stringValue" in fields[f]}
        if not creds:
            continue
        print(f"{org_id}: {sorted(creds)} → private/odoo" + ("" if apply else " (dry run)"))
        if not apply:
            continue
        s, r = http("PATCH", f"{BASE}/organizations/{org_id}/private/odoo", tok,
                    {"fields": {k: {"stringValue": v} for k, v in creds.items()}})
        if s != 200:
            print(f"  ERROR escribiendo private/odoo: {r}")
            continue
        mask = "&".join(f"updateMask.fieldPaths={f}" for f in creds)
        s, r = http("PATCH", f"{BASE}/organizations/{org_id}?{mask}", tok, {"fields": {}})
        if s != 200:
            print(f"  ERROR borrando campos del org: {r}")
            continue
        moved += 1
    print(f"{'Migradas' if apply else 'Por migrar'}: {moved if apply else 'ver arriba'}")


if __name__ == "__main__":
    main()
