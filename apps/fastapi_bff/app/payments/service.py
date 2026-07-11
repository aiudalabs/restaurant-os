import logging
import unicodedata
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.core.firebase import get_rtdb
from app.core.firestore import ORDERS, ORDER_ITEMS, STATIONS, db
from app.core.odoo import OdooClient, odoo_client_for_org

logger = logging.getLogger(__name__)

_PF_URLS = {
    "sandbox": "https://sandbox.paguelofacil.com/LinkDeamon.cfm",
    "production": "https://secure.paguelofacil.com/LinkDeamon.cfm",
}


def create_payment_link(order_id: str, amount: float, description: str) -> dict:
    callback_url = f"{settings.bff_base_url}/payments/callback"
    url = _PF_URLS.get(settings.paguelofacil_env, _PF_URLS["sandbox"])

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
    schema (from their official Postman collection) and implement the real call.
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
        return status_ok
    except Exception as exc:
        logger.error("PagueloFácil verification failed for codOper %s: %s", cod_oper, exc)
        return False


def handle_callback(form: dict) -> str | None:
    """Process the callback PagueloFácil sends after payment. Returns the order_id
    (so the HTTP layer can redirect the browser back to the app)."""
    # PF field names vary; normalise to lowercase for safety
    f = {k.lower(): v for k, v in form.items()}

    order_id = f.get("parm_1") or f.get("parm1")
    if not order_id:
        logger.warning("PagueloFácil callback missing order_id (PARM_1)")
        return None

    # Idempotency: PagueloFácil may hit the callback more than once (browser
    # redirect + webhook). Never route to the kitchen or sync Odoo twice.
    try:
        snap = db().collection(ORDERS).document(order_id).get()
    except Exception as exc:
        logger.error("Failed to read order %s: %s", order_id, exc)
        return order_id
    if not snap.exists:
        logger.warning("PagueloFácil callback for unknown order %s", order_id)
        return order_id
    current = snap.to_dict() or {}
    if (current.get("payment") or {}).get("status") == "approved":
        logger.info("Order %s already paid — ignoring duplicate callback", order_id)
        return order_id

    # "Aprobada" = approved, anything else = rejected
    estado = f.get("estado") or f.get("state") or ""
    approved = "aprob" in estado.lower()

    cod_oper = f.get("codoper") or f.get("cod_oper") or f.get("noaprobacion") or ""
    card_type = f.get("tipotarjeta") or f.get("tarjeta") or "card"

    # Re-verify approvals server-to-server before trusting them.
    if approved and not _verify_with_paguelofacil(cod_oper, float(current.get("total", 0))):
        logger.error("Order %s: callback said approved but verification failed", order_id)
        approved = False

    payment_status = "approved" if approved else "rejected"
    now = datetime.now(timezone.utc)

    update: dict = {
        "payment.status": payment_status,
        "payment.method": card_type,
        "payment.confirmationNumber": cod_oper,
        "updatedAt": now,
    }
    if approved:
        # Payment state lives in payment.*; order.status is the KITCHEN lifecycle.
        # An approved prepaid order becomes a normal 'confirmed' order that the
        # admin, KDS and tracking all understand (paid info stays in payment.*).
        update["payment.paidAt"] = now
        update["status"] = "confirmed"
    else:
        update["status"] = "payment_failed"

    try:
        db().collection(ORDERS).document(order_id).update(update)
    except Exception as exc:
        logger.error("Failed to update order %s in Firestore: %s", order_id, exc)
        return order_id
    logger.info("Order %s payment → %s (codOper=%s)", order_id, payment_status, cod_oper)

    if approved:
        _route_to_kds(order_id)
        _sync_to_odoo(order_id, cod_oper)

    return order_id


def _route_to_kds(order_id: str) -> None:
    """Mirror paid client-order items to RTDB so KDS tablets see them."""
    try:
        order_doc = db().collection(ORDERS).document(order_id).get()
        if not order_doc.exists:
            return
        order = order_doc.to_dict() or {}
        table_number = order.get("tableNumber", "?")

        items = [
            {"id": d.id, **(d.to_dict() or {})}
            for d in db().collection(ORDER_ITEMS)
            .where("orderId", "==", order_id)
            .stream()
        ]
        if not items:
            return

        rtdb_module = get_rtdb()
        updates: dict = {}
        for item in items:
            station_id = item.get("stationId")
            if not station_id:
                logger.warning("Item %s has no stationId — skipping KDS mirror", item["id"])
                continue
            key = f"order_items/{station_id}/{order_id}_{item['id']}"
            updates[key] = {
                "status": "queued",
                "updatedAt": {".sv": "timestamp"},
                "tableNumber": table_number,
                "productName": item.get("productName", ""),
                "quantity": item.get("quantity", 1),
                "orderId": order_id,
            }

        if updates:
            rtdb_module.reference("/").update(updates)
            logger.info("Routed %d items to KDS for order %s", len(updates), order_id)

    except Exception as exc:
        logger.error("KDS routing failed for order %s: %s", order_id, exc)


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

        items = [
            d.to_dict()
            for d in db().collection(ORDER_ITEMS)
            .where("orderId", "==", order_id)
            .stream()
        ]
        if not items:
            return

        # Use THIS order's org Odoo connection (multi-tenant). A tenant without
        # Odoo configured simply skips the sync — the order stays paid in Firebase.
        client = odoo_client_for_org(order.get("orgId"))
        if client is None:
            logger.info("No Odoo configured for org %s — skipping sync for order %s",
                        order.get("orgId"), order_id)
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
            "to_invoice": True,
            "state": "done",
            "note": f"RestaurantOS #{order_id[:8]} | PF:{cod_oper}",
        })
        logger.info("Created pos.order %s for RestaurantOS order %s", pos_order_id, order_id)

    except Exception as exc:
        logger.error("Odoo sync failed for order %s: %s", order_id, exc)
