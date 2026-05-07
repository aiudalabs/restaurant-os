import time
from typing import Any

from app.catalog.models import SyncStats
from app.config import settings
from app.core.firestore import CATEGORIES, PRODUCTS, STATIONS, batch_write, db
from app.core.odoo import odoo_client

# Simple in-process cache: (timestamp, data)
_products_cache: tuple[float, list] | None = None
_CACHE_TTL = 60  # seconds


def sync_catalog() -> SyncStats:
    org_id = settings.org_id
    branch_id = settings.branch_id

    # ── 1. Read Odoo POS categories ──────────────────────────────────────────
    odoo_categories = odoo_client.search_read(
        "pos.category",
        [],
        ["id", "name", "sequence"],
    )
    cat_map: dict[int, dict] = {c["id"]: c for c in odoo_categories}

    # ── 2. Read Odoo products available in POS ───────────────────────────────
    odoo_products = odoo_client.search_read(
        "product.product",
        [["available_in_pos", "=", True]],
        ["id", "name", "list_price", "pos_category_id", "description_sale", "active"],
    )

    # ── 3. Read Firestore menu_id for this branch ────────────────────────────
    branch_doc = db().collection("branches").document(branch_id).get()
    menu_id: str = ""
    if branch_doc.exists:
        menu_id = branch_doc.to_dict().get("menuId", "")  # type: ignore[union-attr]

    # ── 4. Read stations to infer stationId by category name ─────────────────
    station_docs = (
        db()
        .collection(STATIONS)
        .where("branchId", "==", branch_id)
        .stream()
    )
    station_category_map: dict[str, str] = {}
    for s in station_docs:
        sd = s.to_dict()
        for cid in sd.get("categoryIds", []):
            station_category_map[cid] = s.id

    # ── 5. Build Firestore docs ───────────────────────────────────────────────
    existing_ids: set[str] = {
        d.id
        for d in db()
        .collection(PRODUCTS)
        .where("orgId", "==", org_id)
        .stream()
    }

    documents: list[tuple[str, str, dict]] = []
    synced_ids: set[str] = set()

    for i, p in enumerate(odoo_products):
        odoo_cat = p.get("pos_category_id")
        cat_id_odoo: int | None = odoo_cat[0] if odoo_cat else None
        cat_name: str = odoo_cat[1] if odoo_cat else "Sin categoría"

        # Firestore category doc id: odoo category id prefixed
        fs_category_id = f"odoo_cat_{cat_id_odoo}" if cat_id_odoo else "odoo_cat_uncategorized"
        fs_product_id = f"odoo_prod_{p['id']}"
        synced_ids.add(fs_product_id)

        # Upsert category first
        documents.append((
            CATEGORIES,
            fs_category_id,
            {
                "orgId": org_id,
                "menuId": menu_id,
                "name": cat_name,
                "sortOrder": cat_map.get(cat_id_odoo, {}).get("sequence", 0) if cat_id_odoo else 0,
                "isActive": True,
                "odooId": cat_id_odoo,
            },
        ))

        documents.append((
            PRODUCTS,
            fs_product_id,
            {
                "orgId": org_id,
                "menuId": menu_id,
                "categoryId": fs_category_id,
                "name": p["name"],
                "description": p.get("description_sale") or "",
                "price": float(p["list_price"]),
                "isActive": bool(p.get("active", True)),
                "sortOrder": i,
                "tags": [],
                "modifierGroups": [],
                "odooId": p["id"],
            },
        ))

    created = len(synced_ids - existing_ids)
    updated = len(synced_ids & existing_ids)

    batch_write(documents)

    # Deactivate products no longer in Odoo
    deleted = 0
    gone = existing_ids - synced_ids
    if gone:
        client = db()
        batch = client.batch()
        for doc_id in gone:
            ref = client.collection(PRODUCTS).document(doc_id)
            batch.update(ref, {"isActive": False})
        batch.commit()
        deleted = len(gone)

    # Invalidate cache
    global _products_cache
    _products_cache = None

    return SyncStats(synced=len(synced_ids), created=created, updated=updated, deleted=deleted)


def get_products() -> list[dict[str, Any]]:
    global _products_cache
    now = time.time()
    if _products_cache and (now - _products_cache[0]) < _CACHE_TTL:
        return _products_cache[1]

    org_id = settings.org_id
    docs = (
        db()
        .collection(PRODUCTS)
        .where("orgId", "==", org_id)
        .where("isActive", "==", True)
        .stream()
    )
    result = [{"id": d.id, **d.to_dict()} for d in docs]
    _products_cache = (now, result)
    return result
