#!/usr/bin/env python3
"""
Backfill Firebase Auth custom claims (orgId, role, stationId) from users/{uid}.

RTDB rules only serve a KDS station's tickets to tokens whose stationId claim
matches. Accounts created before claims existed have none, so their KDS (email
login) would show an empty board after the rules deploy. New accounts get claims
from the Cloud Functions, and the syncStaffClaims trigger keeps them current.

Run ONCE, right before deploying database.rules.json.

Uses gcloud access token (owner/editor of the project required).
No service account file needed.

Usage:
  python3 tools/backfill_staff_claims.py          # dry-run: shows what would change
  python3 tools/backfill_staff_claims.py --yes    # apply
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

from reset_user_password import IDENTITY_TOOLKIT_UPDATE, auth_headers, get_token, list_users


def build_claims(u: dict, org_id: str) -> dict:
    claims = {"orgId": org_id, "role": u["role"]}
    if u["stationId"]:
        claims["stationId"] = u["stationId"]
    return claims


def set_claims(uid: str, claims: dict, token: str) -> tuple[bool, str]:
    body = json.dumps({"localId": uid, "customAttributes": json.dumps(claims)}).encode()
    req = urllib.request.Request(
        IDENTITY_TOOLKIT_UPDATE, data=body, headers=auth_headers(token), method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=30)
        return True, "ok"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:300]}"


def org_ids(token: str) -> dict:
    """uid → orgId (list_users in reset_user_password does not return orgId)."""
    from reset_user_password import FIRESTORE_BASE

    out, page_token = {}, None
    while True:
        url = f"{FIRESTORE_BASE}/users?pageSize=300&mask.fieldPaths=orgId"
        if page_token:
            url += f"&pageToken={page_token}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        data = json.loads(urllib.request.urlopen(req, timeout=30).read())
        for d in data.get("documents", []):
            out[d["name"].split("/")[-1]] = d.get("fields", {}).get("orgId", {}).get("stringValue", "")
        page_token = data.get("nextPageToken")
        if not page_token:
            return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill staff custom claims from users docs.")
    parser.add_argument("--yes", action="store_true", help="Apply (default is dry-run).")
    args = parser.parse_args()

    token = get_token()
    users = list_users(token)
    orgs = org_ids(token)
    failures = 0
    for u in users:
        claims = build_claims(u, orgs.get(u["uid"], ""))
        label = f"{u['email'] or u['uid']:<55} {json.dumps(claims)}"
        if not args.yes:
            print(f"[dry-run] {label}")
            continue
        ok, msg = set_claims(u["uid"], claims, token)
        print(f"{'OK ' if ok else 'ERR'} {label} {'' if ok else msg}")
        failures += 0 if ok else 1

    print(f"\n{len(users)} usuarios. " + ("Aplicado." if args.yes else "Dry-run — usa --yes para aplicar."))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
