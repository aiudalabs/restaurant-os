from pydantic import BaseModel


class SyncStats(BaseModel):
    synced: int
    created: int
    updated: int
    deleted: int


class ProductOut(BaseModel):
    id: str
    name: str
    price: float
    category_id: str
    category_name: str
    is_active: bool
    org_id: str
    menu_id: str
