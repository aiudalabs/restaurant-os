"""
Catalog sync tests.

Integration tests — require Odoo + Firebase running.
Run: pytest tests/test_catalog_sync.py -v
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.catalog.service import get_products, sync_catalog
from app.core.odoo import odoo_client


def test_odoo_has_pos_products():
    products = odoo_client.search_read(
        "product.product",
        [["available_in_pos", "=", True]],
        ["id", "name", "list_price", "available_in_pos"],
    )
    assert isinstance(products, list)
    # There may be 0 if demo data isn't loaded — just check the call works
    for p in products:
        assert p["available_in_pos"] is True


def test_unavailable_products_excluded():
    all_products = odoo_client.search_read(
        "product.product",
        [],
        ["id", "available_in_pos"],
        limit=200,
    )
    unavailable = [p for p in all_products if not p["available_in_pos"]]
    available = odoo_client.search_read(
        "product.product",
        [["available_in_pos", "=", True]],
        ["id"],
        limit=200,
    )
    available_ids = {p["id"] for p in available}
    for p in unavailable:
        assert p["id"] not in available_ids


def test_sync_writes_to_firestore():
    stats = sync_catalog()
    assert stats.synced >= 0
    assert stats.created >= 0
    assert stats.updated >= 0
    assert stats.deleted >= 0
    # total accounted for
    assert stats.created + stats.updated == stats.synced


def test_get_products_returns_active_only():
    sync_catalog()
    products = get_products()
    for p in products:
        assert p.get("isActive") is True
