from fastapi import APIRouter, Depends

from app.catalog.models import SyncStats
from app.catalog.service import get_products, sync_catalog
from app.core.exceptions import OdooRPCError
from app.core.security import require_role

router = APIRouter(tags=["catalog"])


@router.post("/admin/sync-catalog", response_model=SyncStats)
def admin_sync_catalog(_user: dict = Depends(require_role("manager", "admin"))):
    try:
        return sync_catalog()
    except OdooRPCError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/catalog/products")
def catalog_products():
    return get_products()
