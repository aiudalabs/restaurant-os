"""Zaveli tools: the restaurant's menu, orders and order status for the agent.

Zaveli (the conversational agent) calls one URL with a signed body that names the
tool. This module verifies the signature, runs the tool against Firestore and
builds the reply of the Zaveli contract (integration guide, step 4).

- The business comes from the signed context (`business_ref` = our branch id),
  never from the arguments the model proposes.
- Prices and totals are computed here from Firestore; the model never sends one.
- `operation_id` is the key of an operation: an order's document id is derived
  from it and the reply is stored in that document, in the same transaction that
  creates it. A repeated call returns the stored reply and creates nothing.
- Calls marked `context.conformance` (Zaveli's probes) build the same reply and
  write nothing.
"""

import hashlib
import hmac
import logging
import re
from collections import OrderedDict
from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from google.cloud import firestore as gcf
from pydantic import ValidationError

from app.config import settings
from app.core.firestore import BRANCHES, CATEGORIES, ORDER_ITEMS, ORDERS, ORGANIZATIONS, PRODUCTS, db
from app.zaveli.models import (
    Amount,
    CallContext,
    CreateOrderArgs,
    Event,
    NoArgs,
    OrderStatusArgs,
    ToolCall,
    ToolReply,
)

logger = logging.getLogger(__name__)

MAX_SKEW_SECONDS = 300
MAX_MENU_PRODUCTS = 20  # Zaveli accepts at most 20 amounts per reply
CENT = Decimal("0.01")
_SIGNATURE = re.compile(r"t=([0-9]{1,12}),v1=([0-9a-f]{64})")
# Same alphabet as customer_web pickup codes: no 0/O/1/I/L, easy to read aloud.
_CODE_ALPHABET = "ACDEFGHJKMNPQRSTUVWXYZ2345679"
_CODE_PREFIX = "Z-"
_ORDER_DOC_PREFIX = "zaveli_"

_STATUS_LABELS = {
    "pending_payment": "esperando_pago",
    "pending": "recibido",
    "confirmed": "confirmado",
    "in_preparation": "en_preparacion",
    "ready": "listo",
    "delivered": "entregado",
    "cancelled": "cancelado",
    "closed": "cerrado",
}


# ── Signature ──────────────────────────────────────────────────────────────────

def signing_secrets() -> list[str]:
    return [s.strip() for s in settings.zaveli_signing_secrets.split(",") if s.strip()]


def signature_ok(header: str | None, body: bytes, secrets: Sequence[str], now: float) -> bool:
    """`Zaveli-Signature: t=<unix>,v1=<hex>`: HMAC-SHA256 of `<t>.` + the body as
    received, with any current secret (new and, during a rotation, previous)."""
    match = _SIGNATURE.fullmatch(header or "")
    if match is None:
        return False
    timestamp = int(match.group(1))
    received = bytes.fromhex(match.group(2))
    signed = f"{timestamp}.".encode() + body
    valid = False
    for secret in secrets:
        expected = hmac.new(secret.encode(), signed, hashlib.sha256).digest()
        # Compare against every secret, no early exit.
        valid = hmac.compare_digest(received, expected) or valid
    return valid and abs(now - timestamp) <= MAX_SKEW_SECONDS


# ── Helpers ────────────────────────────────────────────────────────────────────

def _money(value: Any) -> Decimal:
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def _amount(value: Decimal, currency: str) -> Amount:
    return Amount(value=str(value), currency=currency)


def _rejected(message_code: str, data: dict[str, Any] | None = None) -> ToolReply:
    return ToolReply(status="REJECTED", message_code=message_code, data=data)


def _order_code(context: CallContext, operation_id: str) -> str:
    """Deterministic pickup code from the operation: the same call gets the same
    code (and document), so a replay finds what the first call created."""
    digest = hashlib.sha256(f"{context.business_id}\x00{operation_id}".encode()).digest()
    chars = "".join(_CODE_ALPHABET[b % len(_CODE_ALPHABET)] for b in digest[:8])
    return f"{_CODE_PREFIX}{chars}"


def _normalize_code(raw: str) -> str:
    cleaned = re.sub(r"\s+", "", raw.strip().upper())
    cleaned = re.sub(r"^Z-?", "", cleaned)
    return f"{_CODE_PREFIX}{cleaned}"


def _order_doc_id(code: str) -> str:
    return _ORDER_DOC_PREFIX + code.removeprefix(_CODE_PREFIX)


def _branch_for(context: CallContext) -> dict[str, Any] | None:
    """The branch linked to the Zaveli business (its external_ref)."""
    if not context.business_ref:
        return None
    snap = db().collection(BRANCHES).document(context.business_ref).get()
    if not snap.exists:
        return None
    branch = snap.to_dict() or {}
    if not branch.get("isActive", False):
        return None
    return {**branch, "id": snap.id}


def _currency(org_id: str) -> str:
    snap = db().collection(ORGANIZATIONS).document(org_id).get()
    org = (snap.to_dict() or {}) if snap.exists else {}
    return str(org.get("defaultCurrency") or "USD")


def _menu_products(branch: dict[str, Any]) -> list[dict[str, Any]]:
    """Active products of the branch's menu, in menu order (category, product)."""
    org_id, menu_id = branch["orgId"], branch.get("menuId", "")
    categories = {
        snap.id: snap.to_dict() or {}
        for snap in db().collection(CATEGORIES)
        .where("orgId", "==", org_id)
        .where("menuId", "==", menu_id)
        .stream()
    }
    products = []
    for snap in (
        db().collection(PRODUCTS)
        .where("orgId", "==", org_id)
        .where("menuId", "==", menu_id)
        .where("isActive", "==", True)
        .stream()
    ):
        product = snap.to_dict() or {}
        category = categories.get(product.get("categoryId", ""))
        if category is None or not category.get("isActive", False):
            continue
        products.append({**product, "id": snap.id, "_category": category})
    products.sort(key=lambda p: (p["_category"].get("sortOrder", 0), p.get("sortOrder", 0), p["id"]))
    return products


# ── Tools ──────────────────────────────────────────────────────────────────────

def _view_menu(call: ToolCall) -> ToolReply:
    NoArgs.model_validate(call.arguments)
    branch = _branch_for(call.context)
    if branch is None:
        return _rejected("business_not_configured")
    currency = _currency(branch["orgId"])
    products = _menu_products(branch)[:MAX_MENU_PRODUCTS]
    prices = [_money(p.get("price", 0)) for p in products]
    return ToolReply(
        status="CONFIRMED",
        message_code="menu_listed",
        data={
            "moneda": currency,
            "impuesto_porcentaje": str(_money(Decimal(str(branch.get("taxPercent", 0))) * 100)),
            "productos": [
                {
                    "codigo": p["id"],
                    "nombre": p.get("name", ""),
                    "categoria": p["_category"].get("name", ""),
                    "precio": str(price),
                }
                for p, price in zip(products, prices)
            ],
        },
        # The only prices the agent may say: one per distinct menu price.
        amounts=[_amount(v, currency) for v in sorted(set(prices))],
        already_done=False,
    )


def _create_order(call: ToolCall) -> ToolReply:
    args = CreateOrderArgs.model_validate(call.arguments)
    context = call.context
    branch = _branch_for(context)
    if branch is None:
        return _rejected("business_not_configured")

    code = _order_code(context, call.operation_id)
    order_ref = db().collection(ORDERS).document(_order_doc_id(code))

    # Replay: the operation already ran: return the reply stored with the order.
    existing = order_ref.get()
    if existing.exists:
        return _stored_reply(existing.to_dict() or {}, call.operation_id)

    products = {p["id"]: p for p in _menu_products(branch)}
    unknown = sorted({product_id for product_id in args.productos if product_id not in products})
    if unknown:
        return _rejected("unknown_product", {"codigos_desconocidos": unknown[:20]})

    quantities: dict[str, int] = {}
    for product_id in args.productos:
        quantities[product_id] = quantities.get(product_id, 0) + 1

    # Totals from Firestore prices, computed here; never from the model.
    currency = _currency(branch["orgId"])
    tax_percent = Decimal(str(branch.get("taxPercent", 0)))
    lines = []
    for product_id, qty in quantities.items():
        unit = _money(products[product_id].get("price", 0))
        lines.append((products[product_id], qty, unit, unit * qty))
    subtotal = sum((line[3] for line in lines), Decimal("0"))
    tax = (subtotal * tax_percent).quantize(CENT, rounding=ROUND_HALF_UP)
    total = subtotal + tax
    item_count = sum(quantities.values())

    reply = ToolReply(
        status="CONFIRMED",
        message_code="order_created",
        reference=code,
        data={
            "pedido": code,
            "estado": _STATUS_LABELS["pending"],
            "productos": [
                {"codigo": p["id"], "nombre": p.get("name", ""), "cantidad": qty, "importe": str(amount)}
                for p, qty, _, amount in lines
            ],
            "subtotal": str(subtotal),
            "impuesto": str(tax),
            "total": str(total),
            "moneda": currency,
            "pago": "al_retirar",
        },
        amounts=[_amount(v, currency) for v in dict.fromkeys([total, subtotal, tax])],
        already_done=False,
    )
    if context.conformance:
        return reply

    reply_json = reply.to_bytes().decode()
    order_doc = {
        "id": order_ref.id,
        "orgId": branch["orgId"],
        "branchId": branch["id"],
        "tableId": "",  # no physical table — pickup/counter service
        "tableNumber": code,
        "source": "zaveli",
        "customerName": (args.nombre or "").strip() or "Cliente",
        "pickupCode": code,
        "status": "pending",  # onOrderCreated routes it and moves it to confirmed
        "subtotal": float(subtotal),
        "taxAmount": float(tax),
        "taxPercent": float(tax_percent),
        "tipAmount": 0,
        "total": float(total),
        "notes": (args.notas or "").strip(),
        "itemCount": item_count,
        "payment": {"method": None, "status": None},
        "createdAt": gcf.SERVER_TIMESTAMP,
        "updatedAt": gcf.SERVER_TIMESTAMP,
        "zaveli": {
            "operationId": call.operation_id,
            "businessId": context.business_id,
            "conversationId": context.conversation_id or "",
            "reply": reply_json,
        },
    }
    item_docs = []
    for index, (product, qty, unit, amount) in enumerate(lines):
        item_id = f"{order_ref.id}_{index}"
        item_docs.append((item_id, {
            "id": item_id,
            "orgId": branch["orgId"],
            "branchId": branch["id"],
            "orderId": order_ref.id,
            "stationId": "",  # assigned by onOrderCreated
            "tableNumber": code,
            "productId": product["id"],
            "productName": product.get("name", ""),
            "categoryId": product.get("categoryId", ""),
            "quantity": qty,
            "unitPrice": float(unit),
            "totalPrice": float(amount),
            "modifiers": [],
            "specialInstructions": "",
            "status": "queued",
            "sentToStationAt": gcf.SERVER_TIMESTAMP,
        }))

    stored = _create_in_transaction(order_ref, order_doc, item_docs)
    if stored is not None:
        # Another call with the same operation won the race: answer what it stored.
        return _stored_reply(stored, call.operation_id)
    logger.info("Zaveli order %s created for branch %s", code, branch["id"])
    return reply


def _create_in_transaction(
    order_ref: Any, order_doc: dict[str, Any], item_docs: list[tuple[str, dict[str, Any]]]
) -> dict[str, Any] | None:
    """Creates the order, its items and the stored reply atomically. Returns the
    existing order instead when the document already exists."""
    client = db()

    @gcf.transactional
    def run(transaction: gcf.Transaction) -> dict[str, Any] | None:
        snap = order_ref.get(transaction=transaction)
        if snap.exists:
            return snap.to_dict() or {}
        transaction.create(order_ref, order_doc)
        for item_id, item in item_docs:
            transaction.create(client.collection(ORDER_ITEMS).document(item_id), item)
        return None

    return run(client.transaction())


def _stored_reply(order: dict[str, Any], operation_id: str) -> ToolReply:
    stored = order.get("zaveli") or {}
    if stored.get("operationId") != operation_id or not stored.get("reply"):
        # A different operation hashed to the same code: nothing was created.
        logger.error("Zaveli order code collision for operation %s", operation_id)
        return _rejected("order_code_unavailable")
    return ToolReply.model_validate_json(stored["reply"])


def _order_status(call: ToolCall) -> ToolReply:
    args = OrderStatusArgs.model_validate(call.arguments)
    branch = _branch_for(call.context)
    if branch is None:
        return _rejected("business_not_configured")
    code = _normalize_code(args.pedido)
    snap = db().collection(ORDERS).document(_order_doc_id(code)).get()
    order = (snap.to_dict() or {}) if snap.exists else {}
    # An order of another business does not exist for this one.
    if (
        not order
        or order.get("orgId") != branch["orgId"]
        or order.get("branchId") != branch["id"]
        or (order.get("zaveli") or {}).get("businessId") != call.context.business_id
    ):
        return _rejected("order_not_found")
    currency = _currency(branch["orgId"])
    items = (
        db().collection(ORDER_ITEMS)
        .where("orgId", "==", branch["orgId"])
        .where("orderId", "==", snap.id)
        .stream()
    )
    total = _money(order.get("total", 0))
    return ToolReply(
        status="CONFIRMED",
        message_code="order_status",
        reference=code,
        data={
            "pedido": code,
            "estado": _STATUS_LABELS.get(str(order.get("status")), "desconocido"),
            "productos": [
                {"nombre": item.get("productName", ""), "cantidad": item.get("quantity", 0)}
                for item in (i.to_dict() or {} for i in items)
            ],
            "total": str(total),
            "moneda": currency,
        },
        amounts=[_amount(total, currency)],
        # A status read is not a confirmation of anything (guide, step 4).
        already_done=False,
    )


_TOOLS = {
    "ver_menu": _view_menu,
    "crear_pedido": _create_order,
    "estado_pedido": _order_status,
}


def handle_tool_call(call: ToolCall) -> bytes:
    """The reply body for a verified call. Business refusals are 200 REJECTED."""
    tool = _TOOLS.get(call.tool)
    if tool is None:
        return _rejected("unknown_tool").to_bytes()
    try:
        reply = tool(call)
    except ValidationError:
        reply = _rejected("invalid_arguments")
    return reply.to_bytes()


# ── Events ─────────────────────────────────────────────────────────────────────

# Delivery is at least once: remember each event_id (this process only).
_seen_events: OrderedDict[str, None] = OrderedDict()
_MAX_SEEN_EVENTS = 10_000


def record_event(event: Event) -> None:
    if event.event_id in _seen_events:
        return
    _seen_events[event.event_id] = None
    if len(_seen_events) > _MAX_SEEN_EVENTS:
        _seen_events.popitem(last=False)
    logger.info(
        "Zaveli event %s type=%s business_ref=%s occurred_at=%s",
        event.event_id, event.type, event.business_ref, event.occurred_at,
    )


def firestore_ready() -> bool:
    """Warms the Firestore client (first call pays the init)."""
    db().collection(BRANCHES).limit(1).get()
    return True
