"""Electronic invoice orchestration: numbering, Digifact, Storage, Firestore.

Called by the onOrderPaid Cloud Function (internal token) and by staff from the
admin ("Reintentar"). Never raises to the HTTP layer: the result is always the
`fiscal` block written on the order.

State machine of orders/{id}.fiscal.status:
  (none) → skipped   org has no fiscal config / fiscal.enabled != true
  (none) → issuing   number allocated and persisted BEFORE calling Digifact
  issuing → issued   CUFE + PDF/XML stored
  issuing → error    Digifact rejected it (number kept; retry reuses it)
A duplicate answer from Digifact (the response was lost) is reconciled by
looking the number up instead of burning a new one.
"""
import logging
import random
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from urllib.parse import quote

from firebase_admin import storage
from google.cloud import firestore as gcf

from app.config import settings
from app.core.firestore import BRANCHES, ORDER_ITEMS, ORDERS, ORGANIZATIONS, PRODUCTS, db
from app.fiscal.digifact import DigifactClient, DigifactDuplicate, DigifactError
from app.fiscal.models import FiscalConfigError, FiscalTotalsMismatch
from app.fiscal.nuc import build_nuc

logger = logging.getLogger(__name__)

PANAMA_TZ = timezone(timedelta(hours=-5))


class FiscalNotFound(Exception):
    pass


# ── Firestore / Storage access (monkeypatched in tests) ─────────────────────

def _load(order_id: str) -> tuple[Any, dict[str, Any], list[dict[str, Any]], dict[str, Any], dict[str, Any], dict[str, dict[str, Any]]]:
    client = db()
    order_ref = client.collection(ORDERS).document(order_id)
    snap = order_ref.get()
    if not snap.exists:
        raise FiscalNotFound(order_id)
    order = snap.to_dict() or {}
    items = [d.to_dict() for d in client.collection(ORDER_ITEMS).where("orderId", "==", order_id).stream()]
    items = [it for it in items if it.get("status") != "cancelled"]
    org = (client.collection(ORGANIZATIONS).document(order["orgId"]).get().to_dict()) or {}
    branch = (client.collection(BRANCHES).document(order["branchId"]).get().to_dict()) or {}
    products: dict[str, dict[str, Any]] = {}
    for it in items:
        pid = str(it.get("productId") or "")
        if pid and pid not in products:
            products[pid] = client.collection(PRODUCTS).document(pid).get().to_dict() or {}
    return order_ref, order, items, org, branch, products


def _write_fiscal(order_ref: Any, patch: dict[str, Any]) -> None:
    order_ref.update({f"fiscal.{k}": v for k, v in patch.items()} | {"updatedAt": datetime.now(timezone.utc)})


def _allocate_number(branch_id: str) -> str:
    """Next NumeroDF of the branch's billing point, in one transaction."""
    client = db()
    ref = client.collection(BRANCHES).document(branch_id)

    @gcf.transactional
    def run(tx: gcf.Transaction) -> int:
        snap = ref.get(transaction=tx)
        data = snap.to_dict() or {}
        n = int(((data.get("fiscal") or {}).get("nextNumber")) or 1)
        tx.update(ref, {"fiscal.nextNumber": n + 1})
        return n

    n = run(client.transaction())
    return f"{n:010d}"


def _codigo_seguridad(numero_df: str) -> str:
    while True:
        code = f"{random.SystemRandom().randint(1, 999_999_999):09d}"
        if code != numero_df[-9:]:
            return code


def _credentials(org_id: str) -> dict[str, Any]:
    snap = db().collection(ORGANIZATIONS).document(org_id).collection("private").document("digifact").get()
    return (snap.to_dict() or {}) if snap.exists else {}


def _save_token(org_id: str, token: str, expires_at: datetime) -> None:
    db().collection(ORGANIZATIONS).document(org_id).collection("private").document("digifact").set(
        {"token": token, "tokenExpiresAt": expires_at}, merge=True
    )


def _client_for(org_id: str, org: dict[str, Any]) -> DigifactClient:
    creds = _credentials(org_id)
    if not creds.get("username") or not creds.get("password"):
        raise FiscalConfigError("credenciales de Digifact (organizations/{orgId}/private/digifact)")
    of = org.get("fiscal") or {}
    base = settings.digifact_prod_url if of.get("env") == "prod" else settings.digifact_test_url
    exp = creds.get("tokenExpiresAt")
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return DigifactClient(
        base_url=base,
        ruc=str(of.get("ruc") or ""),
        username=str(creds["username"]),
        password=str(creds["password"]),
        token=creds.get("token"),
        token_expires_at=exp,
    )


def _bucket_name() -> str:
    return settings.firebase_storage_bucket or f"{settings.firebase_project_id}.firebasestorage.app"


def _upload(path: str, data: bytes, content_type: str) -> str:
    """Uploads to Firebase Storage; returns the public download URL (rules allow
    reads of orgs/{orgId}/invoices/*; the CUFE in the name is unguessable)."""
    bucket = storage.bucket(_bucket_name())
    blob = bucket.blob(path)
    blob.upload_from_string(data, content_type=content_type)
    return f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/{quote(path, safe='')}?alt=media"


# ── public API ──────────────────────────────────────────────────────────────

def get_fiscal(order_id: str) -> dict[str, Any]:
    snap = db().collection(ORDERS).document(order_id).get()
    if not snap.exists:
        raise FiscalNotFound(order_id)
    return (snap.to_dict() or {}).get("fiscal") or {"status": "none", "attempts": 0}


def issue_invoice(
    order_id: str,
    *,
    client_factory: Callable[[str, dict[str, Any]], DigifactClient] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    order_ref, order, items, org, branch, products = _load(order_id)
    fiscal: dict[str, Any] = dict(order.get("fiscal") or {})
    of = org.get("fiscal") or {}

    if of.get("enabled") is not True:
        _write_fiscal(order_ref, {"status": "skipped", "attempts": int(fiscal.get("attempts") or 0)})
        return {"status": "skipped"}
    if fiscal.get("status") == "issued":
        return fiscal
    if (order.get("payment") or {}).get("status") != "paid":
        _write_fiscal(order_ref, {"status": "error", "lastError": "El pedido no está pagado.", "attempts": int(fiscal.get("attempts") or 0)})
        return {**fiscal, "status": "error", "lastError": "El pedido no está pagado."}

    env = "prod" if of.get("env") == "prod" else "test"
    attempts = int(fiscal.get("attempts") or 0) + 1

    # 1. Fiscal number: allocate once and persist BEFORE talking to Digifact so a
    #    lost response can be reconciled instead of producing a second document.
    numero_df = fiscal.get("numeroDF")
    billing_point = fiscal.get("billingPoint") or (branch.get("fiscal") or {}).get("billingPoint")
    codigo = fiscal.get("codigoSeguridad")
    if not numero_df:
        try:
            numero_df = _allocate_number(order["branchId"])
        except Exception as exc:  # noqa: BLE001
            msg = f"No se pudo asignar número fiscal: {exc}"[:500]
            _write_fiscal(order_ref, {"status": "error", "lastError": msg, "attempts": attempts})
            return {"status": "error", "lastError": msg, "attempts": attempts}
        codigo = _codigo_seguridad(numero_df)
    issuing = {
        "status": "issuing",
        "numeroDF": numero_df,
        "billingPoint": billing_point,
        "codigoSeguridad": codigo,
        "attempts": attempts,
        "lastError": None,
    }
    _write_fiscal(order_ref, issuing)
    fiscal.update(issuing)

    # 2. Build and certify.
    issued_at = (now or datetime.now(PANAMA_TZ)).astimezone(PANAMA_TZ)
    try:
        client = (client_factory or _client_for)(order["orgId"], org)
        nuc = build_nuc(order, items, org, branch, products, numero_df, codigo, issued_at, env)
        had_token = client.token_valid()
        try:
            result = client.certify(nuc)
        except DigifactDuplicate:
            found = client.get_by_number(numero_df)
            if not found or not found.get("CUFE"):
                raise
            logger.warning("Order %s: NumeroDF %s already certified; reconciled by lookup", order_id, numero_df)
            pdf, xml = client.get_document(found["CUFE"])
            result = _reconciled(found, pdf, xml)
        if not had_token and client.token and client.token_expires_at and client_factory is None:
            _save_token(order["orgId"], client.token, client.token_expires_at)
    except (FiscalConfigError, FiscalTotalsMismatch, DigifactError) as exc:
        msg = str(exc)[:900]
        logger.error("Order %s: invoice failed: %s", order_id, msg)
        _write_fiscal(order_ref, {"status": "error", "lastError": msg, "attempts": attempts})
        return {**fiscal, "status": "error", "lastError": msg}
    except Exception as exc:  # noqa: BLE001
        msg = f"{type(exc).__name__}: {exc}"[:900]
        logger.exception("Order %s: unexpected invoice failure", order_id)
        _write_fiscal(order_ref, {"status": "error", "lastError": msg, "attempts": attempts})
        return {**fiscal, "status": "error", "lastError": msg}

    # 3. Store the documents and the result.
    org_id = order["orgId"]
    paths: dict[str, str] = {}
    try:
        if result.pdf:
            paths["pdfPath"] = f"orgs/{org_id}/invoices/{result.cufe}.pdf"
            paths["pdfUrl"] = _upload(paths["pdfPath"], result.pdf, "application/pdf")
        if result.xml:
            paths["xmlPath"] = f"orgs/{org_id}/invoices/{result.cufe}.xml"
            paths["xmlUrl"] = _upload(paths["xmlPath"], result.xml, "application/xml")
    except Exception as exc:  # noqa: BLE001
        # The document IS certified; losing the file copy is recoverable (GetDocument).
        logger.error("Order %s: invoice %s certified but upload failed: %s", order_id, result.cufe, exc)
    issued = {
        "status": "issued",
        "cufe": result.cufe,
        "qrUrl": result.qr_url,
        "docGuid": result.doc_guid,
        "issuedAt": issued_at,
        "lastError": None,
        **paths,
    }
    _write_fiscal(order_ref, issued)
    logger.info("Order %s: invoice %s issued (NumeroDF %s)", order_id, result.cufe, numero_df)
    return {**fiscal, **issued}


def _reconciled(found: dict[str, Any], pdf: bytes | None, xml: bytes | None):
    from app.fiscal.models import CertifyResult

    return CertifyResult(
        cufe=str(found.get("CUFE") or ""),
        qr_url="",
        doc_guid=str(found.get("GUID") or ""),
        issued_at=str(found.get("FECHA_DE_EMISION") or ""),
        pdf=pdf,
        xml=xml,
    )


def new_internal_token() -> str:
    return secrets.token_hex(32)
