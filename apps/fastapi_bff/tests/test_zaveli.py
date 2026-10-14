"""Zaveli endpoint: signature, request checks and order codes. No Firestore."""

import hashlib
import hmac
import json
import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.zaveli import service
from app.zaveli.models import CallContext, ToolCall
from app.zaveli.router import router

SECRET = "zsk_test_only"


def _sign(body: bytes, secret: str = SECRET, t: int | None = None) -> str:
    t = int(time.time()) if t is None else t
    mac = hmac.new(secret.encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={t},v1={mac}"


def _body(tool: str = "ver_menu", operation_id: str = "op-1", arguments: dict | None = None) -> bytes:
    return json.dumps({
        "operation_id": operation_id,
        "tool": tool,
        "arguments": arguments or {},
        "context": {"business_id": "biz-1", "conformance": True},
    }).encode()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings, "zaveli_signing_secrets", f"zsk_previous,{SECRET}")
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_signature_accepts_any_current_secret_and_rejects_others():
    body = b'{"a":1}'
    now = time.time()
    assert service.signature_ok(_sign(body), body, ["other", SECRET], now)
    assert not service.signature_ok(_sign(body, "wrong"), body, [SECRET], now)
    assert not service.signature_ok(_sign(body), body + b" ", [SECRET], now)
    assert not service.signature_ok(None, body, [SECRET], now)
    assert not service.signature_ok(_sign(body), body, [], now)


def test_signature_rejects_stale_timestamp():
    body = b"{}"
    old = int(time.time()) - 600
    assert not service.signature_ok(_sign(body, t=old), body, [SECRET], time.time())


def test_bad_signature_is_401(client: TestClient):
    body = _body()
    resp = client.post("/zaveli/tools", content=body,
                       headers={"Zaveli-Signature": _sign(body, "wrong"), "Idempotency-Key": "op-1"})
    assert resp.status_code == 401


def test_idempotency_key_must_match_operation_id(client: TestClient):
    body = _body()
    resp = client.post("/zaveli/tools", content=body,
                       headers={"Zaveli-Signature": _sign(body), "Idempotency-Key": "other"})
    assert resp.status_code == 400


def test_unknown_tool_is_200_rejected(client: TestClient):
    body = _body(tool="borrar_todo")
    resp = client.post("/zaveli/tools", content=body,
                       headers={"Zaveli-Signature": _sign(body), "Idempotency-Key": "op-1"})
    assert resp.status_code == 200
    assert resp.json() == {"status": "REJECTED", "message_code": "unknown_tool"}


def test_invalid_arguments_are_rejected_before_firestore(client: TestClient):
    body = _body(tool="ver_menu", arguments={"x": 1})
    resp = client.post("/zaveli/tools", content=body,
                       headers={"Zaveli-Signature": _sign(body), "Idempotency-Key": "op-1"})
    assert resp.json() == {"status": "REJECTED", "message_code": "invalid_arguments"}


def test_event_is_204_and_deduplicated(client: TestClient):
    body = json.dumps({"event_id": "ev-1", "type": "conversation.started", "version": 1}).encode()
    for _ in range(2):
        resp = client.post("/zaveli/events", content=body, headers={"Zaveli-Signature": _sign(body)})
        assert resp.status_code == 204
    assert "ev-1" in service._seen_events


def test_order_code_is_deterministic_per_business_and_operation():
    ctx = CallContext(business_id="biz-1")
    code = service._order_code(ctx, "op-1")
    assert code == service._order_code(ctx, "op-1")
    assert code != service._order_code(ctx, "op-2")
    assert code != service._order_code(CallContext(business_id="biz-2"), "op-1")
    assert code.startswith("Z-") and len(code) == 10
    assert service._normalize_code(f" {code.lower()} ") == code
    assert service._normalize_code(code.removeprefix("Z-")) == code


def test_tool_call_context_ignores_unknown_fields():
    call = ToolCall.model_validate_json(json.dumps({
        "operation_id": "op", "tool": "ver_menu", "arguments": {},
        "context": {"business_id": "b", "locale": "es", "contact": {"channel": "webchat"}},
    }))
    assert call.context.conformance is False
