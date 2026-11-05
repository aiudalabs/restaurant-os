from fastapi import APIRouter, Depends

from app.catalog.models import SyncStats
from app.catalog.service import get_products, sync_catalog
from app.core.exceptions import OdooRPCError
from app.core.security import branch_of, org_of, require_role

router = APIRouter(tags=["catalog"])


@router.post("/admin/sync-catalog", response_model=SyncStats)
def admin_sync_catalog(user: dict = Depends(require_role("manager", "admin"))):
    try:
        # Sync the caller's own tenant (multi-tenant), not a global org.
        return sync_catalog(org_of(user), branch_of(user))
    except OdooRPCError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/catalog/products")
def catalog_products(org: str | None = None):
    return get_products(org)
