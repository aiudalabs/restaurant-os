import logging
import unicodedata
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.core.firestore import ORDERS, ORDER_ITEMS, db
from app.core.odoo import OdooClient, odoo_client_for_org

logger = logging.getLogger(__name__)

_PF_URLS = {
    "sandbox": "https://sandbox.paguelofacil.com/LinkDeamon.cfm",
    "production": "https://secure.paguelofacil.com/LinkDeamon.cfm",
}


class OrderNotPayable(Exception):
    """The order cannot start an online payment (missing, wrong state, already paid)."""


def create_payment_link(order_id: str) -> dict:
    """Creates a PagueloFácil hosted payment link for an order.

    The amount is the order's total as stored in Firestore (recomputed server-side
    by onOrderCreated); the browser never decides what it pays. Only orders waiting
    for their online payment can start one.
    """
    snap = db().collection(ORDERS).document(order_id).get()
    if not snap.exists:
        raise OrderNotPayable("Pedido no encontrado.")
    order = snap.to_dict() or {}
    if order.get("status") != "pending_payment":
        raise OrderNotPayable(f"El pedido no espera pago en línea (estado {order.get('status')}).")
    if (order.get("payment") or {}).get("status") == "paid":
        raise OrderNotPayable("El pedido ya está pagado.")
    amount = float(order.get("total") or 0)
    if amount <= 0:
        raise OrderNotPayable("El pedido no tiene un total válido.")

    callback_url = f"{settings.bff_base_url}/payments/callback"
    url = _PF_URLS.get(settings.paguelofacil_env, _PF_URLS["sandbox"])
    description = f"Pedido {order.get('pickupCode') or order_id[:8]}"

    payload = {
        "CCLW": settings.paguelofacil_cclw,
        "CMTN": f"{amount:.2f}",
        "CDSC": description[:150],
        "RETURN_URL": callback_url,
        "PARM_1": order_id,
    }

    resp = httpx.post(url, data=payload, timeout=30)
    resp.raise_for_status()

    body = resp.json()
    if not body.get("success"):
        raise ValueError(f"PagueloFácil error: {body}")

    return {
        "payment_url": body["data"]["url"],
        "payment_code": body["data"]["code"],
    }


def _verify_with_paguelofacil(cod_oper: str, expected_amount: float) -> bool:
    """Server-to-server re-check of an approved transaction.

    The PagueloFácil callback is NOT signed, so a forged 'Aprobada' POST could
    otherwise release food for free. When a verify URL + access token are
    configured we re-query PagueloFácil and confirm the operation is really
    approved for the expected amount. If not configured (sandbox/demo), we log a
    loud warning and trust the callback — DO NOT run production without this.

    TODO(go-live): confirm PagueloFácil's REST status endpoint + request/response
    schema (from their official Postman collection) and map the real fields.
    """
    if not settings.paguelofacil_verify_url or not settings.paguelofacil_access_token:
        logger.warning(
            "PagueloFácil server-side verification NOT configured — trusting the "
            "unsigned callback (codOper=%s). Configure paguelofacil_verify_url + "
            "paguelofacil_access_token before going live.",
            cod_oper,
        )
        return True
    try:
        resp = httpx.get(
            settings.paguelofacil_verify_url,
            params={"codOper": cod_oper},
            headers={"Authorization": settings.paguelofacil_access_token},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        # TODO(go-live): map the real fields returned by PagueloFácil.
        status_ok = str(data.get("status", "")).lower().startswith("aprob")
        amount = data.get("amount")
        amount_ok = amount is None or abs(float(amount) - expected_amount) < 0.01
        if not amount_ok:
            logger.error("codOper %s approved for %s but the order total is %s", cod_oper, amount, expected_amount)
        return status_ok and amount_ok
    except Exception as exc:
        logger.error("PagueloFácil verification failed for codOper %s: %s", cod_oper, exc)
        return False


def handle_callback(form: dict) -> str | None:
    """Process the callback PagueloFácil sends after payment. Returns the order_id
    (so the HTTP layer can redirect the browser back to the app).

    Writes payment.status 'paid' (approved) or 'failed' (rejected). Everything that
    follows a payment (KDS release, audit, invoice) is done by the onOrderPaid
    Cloud Function, the same as for cash or Yappy. The Odoo sync stays here
    because the Odoo client lives in the BFF; it is non-blocking.
    """
    # PF field names vary; normalise to lowercase for safety
    f = {k.lower(): v for k, v in form.items()}

    order_id = f.get("parm_1") or f.get("parm1")
    if not order_id:
        logger.warning("PagueloFácil callback missing order_id (PARM_1)")
        return None

    try:
        snap = db().collection(ORDERS).document(order_id).get()
    except Exception as exc:
        logger.error("Failed to read order %s: %s", order_id, exc)
        return order_id
    if not snap.exists:
        logger.warning("PagueloFácil callback for unknown order %s", order_id)
        return order_id
    current = snap.to_dict() or {}

    # Only an order still waiting for its online payment can be settled by the
    # callback. Anything else (already paid at the counter, cancelled, closed,
    # a duplicate callback) is ignored: a forged or late callback must never
    # flip an order's state.
    if (current.get("payment") or {}).get("status") == "paid":
        logger.info("Order %s already paid — ignoring callback", order_id)
        return order_id
    if current.get("status") != "pending_payment":
        logger.warning("Order %s is %s, not pending_payment — ignoring callback", order_id, current.get("status"))
        return order_id

    # "Aprobada" = approved, anything else = rejected
    estado = f.get("estado") or f.get("state") or ""
    approved = "aprob" in estado.lower()

    cod_oper = f.get("codoper") or f.get("cod_oper") or f.get("noaprobacion") or ""
    card_type = f.get("tipotarjeta") or f.get("tarjeta") or ""

    # Re-verify approvals server-to-server before trusting them.
    if approved and not _verify_with_paguelofacil(cod_oper, float(current.get("total", 0))):
        logger.error("Order %s: callback said approved but verification failed", order_id)
        approved = False

    now = datetime.now(timezone.utc)
    if approved:
        update: dict = {
            "payment.method": "card",
            "payment.status": "paid",
            "payment.paidAt": now,
            "payment.recordedBy": "bff",
            "payment.confirmationNumber": cod_oper,
            "payment.cardType": card_type,
            # Payment state lives in payment.*; order.status is the KITCHEN lifecycle.
            "status": "confirmed",
            "updatedAt": now,
        }
    else:
        update = {
            "payment.status": "failed",
            "payment.confirmationNumber": cod_oper,
            "status": "payment_failed",
            "updatedAt": now,
        }

    try:
        db().collection(ORDERS).document(order_id).update(update)
    except Exception as exc:
        logger.error("Failed to update order %s in Firestore: %s", order_id, exc)
        return order_id
    logger.info("Order %s payment → %s (codOper=%s)", order_id, "paid" if approved else "failed", cod_oper)

    if approved:
        _sync_to_odoo(order_id, cod_oper)

    return order_id


def _ascii_name(name: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", name)
        if unicodedata.category(c) != "Mn"
    ).strip()


def _find_odoo_product(client: "OdooClient", product_name: str) -> int | None:
    ascii = _ascii_name(product_name)
    for domain in [
        [["name", "=", product_name]],
        [["name", "=", ascii]],
        [["name", "ilike", product_name]],
        [["name", "ilike", ascii]],
    ]:
        results = client.search_read("product.product", domain, ["id", "name"], limit=1)
        if results:
            return results[0]["id"]
    return None


def _sync_to_odoo(order_id: str, cod_oper: str) -> None:
    """Create a pos.order in Odoo — non-blocking (logs errors, never raises)."""
    try:
        order_doc = db().collection(ORDERS).document(order_id).get()
        if not order_doc.exists:
            return
        order = order_doc.to_dict() or {}

        # Use THIS order's org Odoo connection (multi-tenant). A tenant without
        # Odoo configured simply skips the sync — the order stays paid in Firebase.
        client = odoo_client_for_org(order.get("orgId"))
        if client is None:
            logger.info("No Odoo configured for org %s — skipping sync for order %s",
                        order.get("orgId"), order_id)
            return

        items = [
            d.to_dict()
            for d in db().collection(ORDER_ITEMS)
            .where("orderId", "==", order_id)
            .stream()
        ]
        if not items:
            return

        client.authenticate()

        sessions = client.search_read(
            "pos.session",
            [["state", "=", "opened"]],
            ["id"],
            limit=1,
        )
        if not sessions:
            logger.warning("No open POS session — skipping Odoo sync for order %s", order_id)
            return

        session_id: int = sessions[0]["id"]

        lines = []
        for item in items:
            product_name = item.get("productName", "")
            product_id = _find_odoo_product(client, product_name)
            if product_id is None:
                logger.warning(
                    "No Odoo product found for '%s' — skipping line in order %s",
                    product_name, order_id,
                )
                continue
            qty = item.get("quantity", 1)
            unit_price = float(item.get("unitPrice", 0))
            lines.append((0, 0, {
                "product_id": product_id,
                "full_product_name": product_name,
                "qty": qty,
                "price_unit": unit_price,
                "price_subtotal": unit_price * qty,
                "price_subtotal_incl": unit_price * qty,
            }))

        if not lines:
            return

        # Get next POS order sequence number
        try:
            order_name = client._models.execute_kw(
                client._db, client._uid, client._password,
                "ir.sequence", "next_by_code", [["pos.order"]]
            )
        except Exception:
            order_name = f"ROS-{order_id[:8].upper()}"

        pos_order_id = client.create("pos.order", {
            "name": order_name,
            "session_id": session_id,
            "lines": lines,
            "amount_total": float(order.get("total", 0)),
            "amount_tax": float(order.get("taxAmount", 0)),
            "amount_paid": float(order.get("total", 0)),
            "amount_return": 0,
            # The fiscal document is the PAC's (see docs/DIGIFACT_EVALUATION.md);
            # the pos.order is an accounting record, not the invoice.
            "to_invoice": False,
            "state": "done",
            "note": f"RestaurantOS #{order_id[:8]} | PF:{cod_oper}",
        })
        logger.info("Created pos.order %s for RestaurantOS order %s", pos_order_id, order_id)

    except Exception as exc:
        logger.error("Odoo sync failed for order %s: %s", order_id, exc)
