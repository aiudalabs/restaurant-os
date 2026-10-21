"""Payments: amount from the order, callback guards. No Firestore, no network."""

import pytest

from app.payments import service


class _Snap:
    def __init__(self, data):
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class FakeDoc:
    def __init__(self, store, key):
        self.store, self.key = store, key

    def get(self):
        return _Snap(self.store.get(self.key))

    def update(self, data):
        self.store.setdefault("__updates__", []).append((self.key, data))
        doc = self.store[self.key]
        for k, v in data.items():
            parts = k.split(".")
            cur = doc
            for p in parts[:-1]:
                cur = cur.setdefault(p, {})
            cur[parts[-1]] = v


class FakeCollection:
    def __init__(self, store, name):
        self.store, self.name = store, name

    def document(self, doc_id):
        return FakeDoc(self.store, f"{self.name}/{doc_id}")


class FakeDB:
    def __init__(self, docs):
        self.store = dict(docs)

    def collection(self, name):
        return FakeCollection(self.store, name)


@pytest.fixture
def fake(monkeypatch):
    def make(docs):
        fdb = FakeDB(docs)
        monkeypatch.setattr(service, "db", lambda: fdb)
        monkeypatch.setattr(service, "_sync_to_odoo", lambda *a, **k: fdb.store.setdefault("__odoo__", []).append(a))
        return fdb
    return make


def _pending(total=21.4, **extra):
    return {"orgId": "A", "status": "pending_payment", "total": total, "pickupCode": "P-ABCD",
            "payment": {"method": None, "status": "pending"}, **extra}


def test_init_uses_order_total_not_client_amount(fake, monkeypatch):
    fake({"orders/o1": _pending(total=21.4)})
    sent = {}

    class R:
        def raise_for_status(self): ...
        def json(self): return {"success": True, "data": {"url": "https://pf/x", "code": "c1"}}

    monkeypatch.setattr(service.httpx, "post", lambda url, data, timeout: sent.update(data) or R())
    out = service.create_payment_link("o1")
    assert out["payment_url"] == "https://pf/x"
    assert sent["CMTN"] == "21.40"
    assert sent["PARM_1"] == "o1"
    assert sent["CDSC"] == "Pedido P-ABCD"


@pytest.mark.parametrize("order", [None, _pending() | {"status": "confirmed"}, _pending() | {"payment": {"status": "paid"}}, _pending(total=0)])
def test_init_rejects_order_not_payable(fake, order):
    fake({"orders/o1": order})
    with pytest.raises(service.OrderNotPayable):
        service.create_payment_link("o1")


def test_callback_approved_writes_paid_card(fake):
    fdb = fake({"orders/o1": _pending()})
    assert service.handle_callback({"PARM_1": "o1", "Estado": "Aprobada", "CodOper": "ABC123", "TipoTarjeta": "VISA"}) == "o1"
    o = fdb.store["orders/o1"]
    assert o["payment"]["status"] == "paid"
    assert o["payment"]["method"] == "card"
    assert o["payment"]["recordedBy"] == "bff"
    assert o["payment"]["confirmationNumber"] == "ABC123"
    assert o["status"] == "confirmed"
    assert fdb.store["__odoo__"] == [("o1", "ABC123")]


def test_callback_rejected_writes_failed(fake):
    fdb = fake({"orders/o1": _pending()})
    service.handle_callback({"PARM_1": "o1", "Estado": "Rechazada", "CodOper": "X"})
    o = fdb.store["orders/o1"]
    assert o["payment"]["status"] == "failed" and o["status"] == "payment_failed"
    assert "__odoo__" not in fdb.store


def test_callback_ignores_already_paid(fake):
    fdb = fake({"orders/o1": _pending() | {"status": "confirmed", "payment": {"method": "cash", "status": "paid"}}})
    service.handle_callback({"PARM_1": "o1", "Estado": "Aprobada", "CodOper": "DUP"})
    assert "__updates__" not in fdb.store
    assert fdb.store["orders/o1"]["payment"]["method"] == "cash"


def test_callback_ignores_non_pending_order(fake):
    fdb = fake({"orders/o1": _pending() | {"status": "cancelled"}})
    service.handle_callback({"PARM_1": "o1", "Estado": "Aprobada", "CodOper": "LATE"})
    assert "__updates__" not in fdb.store
    assert fdb.store["orders/o1"]["status"] == "cancelled"


def test_callback_without_order_id_is_noop(fake):
    fdb = fake({})
    assert service.handle_callback({"Estado": "Aprobada"}) is None
    assert "__updates__" not in fdb.store


def test_odoo_client_none_without_config(monkeypatch):
    from app.core import odoo

    monkeypatch.setattr(odoo, "resolve_odoo_config", lambda org_id: None)
    monkeypatch.setattr(odoo.settings, "odoo_url", "")
    monkeypatch.setattr(odoo.settings, "odoo_db", "")
    assert odoo.odoo_client_for_org("org-x") is None
