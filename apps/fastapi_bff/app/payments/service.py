import logging
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.core.firebase import get_rtdb
from app.core.firestore import ORDERS, ORDER_ITEMS, STATIONS, db
from app.core.odoo import OdooClient

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


def handle_callback(form: dict) -> None:
    """Process the POST callback PagueloFácil sends after payment."""
    # PF field names vary; normalise to lowercase for safety
    f = {k.lower(): v for k, v in form.items()}

    order_id = f.get("parm_1") or f.get("parm1")
    if not order_id:
        logger.warning("PagueloFácil callback missing order_id (PARM_1)")
        return

    # "Aprobada" = approved, anything else = rejected
    estado = f.get("estado") or f.get("state") or ""
    approved = "aprob" in estado.lower()

    cod_oper = f.get("codoper") or f.get("cod_oper") or f.get("noaprobacion") or ""
    card_type = f.get("tipotarjeta") or f.get("tarjeta") or "card"
    payment_status = "approved" if approved else "rejected"

    now = datetime.now(timezone.utc)

    update: dict = {
        "payment.status": payment_status,
        "payment.method": card_type,
        "payment.confirmationNumber": cod_oper,
        "updatedAt": now,
    }
    if approved:
        update["payment.paidAt"] = now
        update["status"] = "paid"
    else:
        update["status"] = "payment_failed"

    try:
        db().collection(ORDERS).document(order_id).update(update)
    except Exception as exc:
        logger.error("Failed to update order %s in Firestore: %s", order_id, exc)
        return
    logger.info("Order %s payment → %s (codOper=%s)", order_id, payment_status, cod_oper)

    if approved:
        _route_to_kds(order_id)
        _sync_to_odoo(order_id, cod_oper)


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

        client = OdooClient()
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
            products = client.search_read(
                "product.product",
                [["name", "=", item.get("productName", "")]],
                ["id"],
                limit=1,
            )
            if not products:
                products = client.search_read(
                    "product.product",
                    [["available_in_pos", "=", True]],
                    ["id"],
                    limit=1,
                )
            if not products:
                continue
            product_id: int = products[0]["id"]
            qty = item.get("quantity", 1)
            unit_price = float(item.get("unitPrice", 0))
            lines.append((0, 0, {
                "product_id": product_id,
                "qty": qty,
                "price_unit": unit_price,
                "price_subtotal": unit_price * qty,
                "price_subtotal_incl": unit_price * qty,
            }))

        if not lines:
            return

        pos_order_id = client.create("pos.order", {
            "session_id": session_id,
            "lines": lines,
            "amount_total": float(order.get("total", 0)),
            "amount_tax": float(order.get("taxAmount", 0)),
            "amount_paid": float(order.get("total", 0)),
            "amount_return": 0,
            "state": "done",
            "note": f"RestaurantOS #{order_id[:8]} | PF:{cod_oper}",
        })
        logger.info("Created pos.order %s for RestaurantOS order %s", pos_order_id, order_id)

    except Exception as exc:
        logger.error("Odoo sync failed for order %s: %s", order_id, exc)
