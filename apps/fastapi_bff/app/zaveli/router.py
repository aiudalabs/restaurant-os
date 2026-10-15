import time

from fastapi import APIRouter, Request, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError

from app.config import settings
from app.zaveli.models import Event, ToolCall
from app.zaveli.service import (
    firestore_ready,
    handle_tool_call,
    record_event,
    signature_ok,
    signing_secrets,
)

router = APIRouter(prefix="/zaveli", tags=["zaveli"])

MAX_BODY_BYTES = 64 * 1024


def _error(status_code: int, code: str) -> Response:
    return Response(f'{{"error":"{code}"}}', status_code=status_code, media_type="application/json")


async def _verified_body(request: Request) -> bytes | Response:
    """The raw body if the signature verifies; otherwise the error response.
    Verified on the bytes as received, before parsing any JSON."""
    body = await request.body()
    if len(body) > MAX_BODY_BYTES:
        return _error(413, "body_too_large")
    if not signature_ok(request.headers.get("zaveli-signature"), body, signing_secrets(), time.time()):
        return _error(401, "invalid_signature")
    return body


@router.post("/tools")
async def tool_call(request: Request) -> Response:
    """Every Zaveli tool call (the body names the tool). Always 200 with a reply
    of the contract once the call is authentic and well formed."""
    body = await _verified_body(request)
    if isinstance(body, Response):
        return body
    try:
        call = ToolCall.model_validate_json(body)
    except ValidationError:
        return _error(400, "invalid_request")
    # The key is operation_id (signed). The header is unsigned: it must match.
    if request.headers.get("idempotency-key") != call.operation_id:
        return _error(400, "invalid_request")
    reply = await run_in_threadpool(handle_tool_call, call)
    return Response(reply, media_type="application/json")


@router.post("/events")
async def event(request: Request) -> Response:
    """Zaveli events: verified like a call, deduplicated by event_id, 204 fast."""
    body = await _verified_body(request)
    if isinstance(body, Response):
        return body
    try:
        received = Event.model_validate_json(body)
    except ValidationError:
        return _error(400, "invalid_request")
    record_event(received)
    return Response(status_code=204)


@router.get("/health")
async def health() -> dict[str, str]:
    """Readiness for the local runner: Firestore reachable, secret configured."""
    await run_in_threadpool(firestore_ready)
    return {
        "status": "ok",
        "project": settings.firebase_project_id,
        "signing_secret": "configured" if signing_secrets() else "missing",
    }
