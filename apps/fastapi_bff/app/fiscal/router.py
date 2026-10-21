from fastapi import APIRouter, Depends, HTTPException

from app.core.firestore import ORDERS, USERS, db
from app.core.security import get_current_user, require_internal_token
from app.fiscal import service
from app.fiscal.models import FiscalBlock

router = APIRouter(prefix="/fiscal", tags=["fiscal"])
STAFF = {"admin", "manager", "waiter"}


def _block(data: dict) -> FiscalBlock:
    return FiscalBlock(**{k: v for k, v in data.items() if k in FiscalBlock.model_fields})


def _staff_for_order(user: dict, order_id: str) -> None:
    """Staff (users doc role admin/manager/waiter) of the order's org only."""
    me = db().collection(USERS).document(user["uid"]).get().to_dict() or {}
    if me.get("role") not in STAFF or me.get("isActive") is False:
        raise HTTPException(status_code=403, detail="Solo el personal puede gestionar facturas.")
    snap = db().collection(ORDERS).document(order_id).get()
    if not snap.exists or (snap.to_dict() or {}).get("orgId") != me.get("orgId"):
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")


@router.post("/orders/{order_id}/invoice", response_model=FiscalBlock, dependencies=[Depends(require_internal_token)])
def invoice_internal(order_id: str):
    """Called by the onOrderPaid Cloud Function (X-Internal-Token)."""
    try:
        return _block(service.issue_invoice(order_id))
    except service.FiscalNotFound:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")


@router.post("/orders/{order_id}/retry", response_model=FiscalBlock)
def invoice_retry(order_id: str, user: dict = Depends(get_current_user)):
    """Staff retry from the admin / waiter app after an error."""
    _staff_for_order(user, order_id)
    return _block(service.issue_invoice(order_id))


@router.get("/orders/{order_id}", response_model=FiscalBlock)
def invoice_status(order_id: str, user: dict = Depends(get_current_user)):
    _staff_for_order(user, order_id)
    return _block(service.get_fiscal(order_id))
