"""
Auth tests.

These are integration tests — they require:
  - Odoo running at ODOO_URL with valid credentials
  - Firebase serviceAccountKey.json present

Run: pytest tests/test_auth.py -v
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from app.main import app
from app.core.exceptions import OdooAuthError

client = TestClient(app)


def test_login_valid_credentials():
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "firebase_token" in data
    assert len(data["firebase_token"]) > 10
    emp = data["employee"]
    assert "id" in emp
    assert "name" in emp
    assert "role" in emp
    assert emp["role"] in ("waiter", "kitchen", "manager", "operator")


def test_login_invalid_credentials():
    response = client.post(
        "/auth/login",
        json={"username": "no_existe", "password": "mal"},
    )
    assert response.status_code == 401


def test_login_response_contains_org_branch():
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    emp = response.json()["employee"]
    assert emp["org_id"] != ""
    assert emp["branch_id"] != ""


def test_firebase_custom_token_claims():
    """The custom token payload should carry the expected claims."""
    import base64
    import json

    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    token = response.json()["firebase_token"]

    # Firebase custom tokens are signed JWTs — decode payload without verification
    parts = token.split(".")
    assert len(parts) == 3, "Expected a JWT with 3 parts"
    payload_b64 = parts[1] + "=="  # add padding
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))

    claims = payload.get("claims", {})
    assert "odoo_uid" in claims
    assert "odoo_employee_id" in claims
    assert "role" in claims
    assert "branch_id" in claims
    assert "org_id" in claims
