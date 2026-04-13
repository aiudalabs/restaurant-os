#!/usr/bin/env python3
"""
Reset Firebase Auth password for one or more users by email.

Uses gcloud access token (owner/editor of the project required).
No service account file needed.

Usage:
  # Reset a single user
  python3 tools/reset_user_password.py --email bar@restauranteos.com --password newpass123

  # Reset all operators to the same password
  python3 tools/reset_user_password.py --role operator --password newpass123

  # Reset everyone matching a role filter — dry-run first
  python3 tools/reset_user_password.py --role operator --password newpass123 --dry-run
"""

import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT_ID = "restaurant-os-68c79"
FIRESTORE_BASE = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
    f"/databases/(default)/documents"
)
IDENTITY_TOOLKIT_UPDATE = (
    f"https://identitytoolkit.googleapis.com/v1/projects/{PROJECT_ID}/accounts:update"
)


def get_token() -> str:
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True, text=True,
    )
    token = result.stdout.strip()
    if not token:
        print("ERROR: No gcloud token. Run: gcloud auth login", file=sys.stderr)
        sys.exit(1)
    return token


def auth_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT_ID,
    }


def list_users(token: str) -> list[dict]:
    users = []
    page_token = None
    while True:
        url = f"{FIRESTORE_BASE}/users?pageSize=300"
        if page_token:
            url += f"&pageToken={page_token}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"ERROR listing users: HTTP {e.code} {e.read().decode()[:300]}",
                  file=sys.stderr)
            sys.exit(1)
        for d in data.get("documents", []):
            fields = d.get("fields", {})
            users.append({
                "uid": d["name"].split("/")[-1],
                "email": fields.get("email", {}).get("stringValue", ""),
                "role": fields.get("role", {}).get("stringValue", ""),
                "displayName": fields.get("displayName", {}).get("stringValue", ""),
                "stationId": fields.get("stationId", {}).get("stringValue", ""),
            })
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return users


def reset_password(uid: str, new_password: str, token: str) -> tuple[bool, str]:
    body = json.dumps({"localId": uid, "password": new_password}).encode()
    req = urllib.request.Request(
        IDENTITY_TOOLKIT_UPDATE, data=body, headers=auth_headers(token), method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=30)
        return True, "ok"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:300]}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset Firebase Auth password(s).")
    parser.add_argument("--email", help="Exact email to target (single user).")
    parser.add_argument("--role", help="Filter by role (admin/manager/operator).")
    parser.add_argument("--password", required=True, help="New password to set.")
    parser.add_argument("--dry-run", action="store_true",
                        help="List matches without changing passwords.")
    args = parser.parse_args()

    if not args.email and not args.role:
        parser.error("Provide --email or --role (or both).")

    if len(args.password) < 6:
        parser.error("Password must be at least 6 characters.")

    token = get_token()
    users = list_users(token)

    matched = [
        u for u in users
        if (not args.email or u["email"] == args.email)
        and (not args.role or u["role"] == args.role)
    ]

    if not matched:
        print("No users matched.", file=sys.stderr)
        return 1

    print(f"Project: {PROJECT_ID}")
    print(f"Matched {len(matched)} user(s):")
    for u in matched:
        print(f"  - {u['email']:40s}  role={u['role']:9s}  uid={u['uid']}")
    print()

    if args.dry_run:
        print("DRY-RUN complete. Re-run without --dry-run to apply.")
        return 0

    print(f"Setting password to: {args.password}")
    print()
    failures = 0
    for u in matched:
        ok, msg = reset_password(u["uid"], args.password, token)
        status = "OK  " if ok else "FAIL"
        print(f"  {status} {u['email']}  {'' if ok else msg}")
        if not ok:
            failures += 1

    print()
    print(f"Done. {len(matched) - failures}/{len(matched)} succeeded.")
    return 0 if failures == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
