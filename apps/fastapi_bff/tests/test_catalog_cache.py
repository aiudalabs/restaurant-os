"""The product cache is per organization: tenant A never sees tenant B's menu."""

from app.catalog import service


class _Doc:
    def __init__(self, id_, data):
        self.id, self._d = id_, data

    def to_dict(self):
        return dict(self._d)


class _Query:
    def __init__(self, docs, filters):
        self.docs, self.filters = docs, filters

    def where(self, field, op, value):
        return _Query(self.docs, self.filters + [(field, value)])

    def stream(self):
        return [d for d in self.docs if all(d._d.get(f) == v for f, v in self.filters)]


class _DB:
    def __init__(self, docs):
        self.docs = docs

    def collection(self, name):
        return _Query(self.docs, [])


def test_products_cache_is_keyed_by_org(monkeypatch):
    docs = [_Doc("p1", {"orgId": "A", "isActive": True, "name": "Pizza"}),
            _Doc("p2", {"orgId": "B", "isActive": True, "name": "Sushi"})]
    monkeypatch.setattr(service, "db", lambda: _DB(docs))
    service._products_cache.clear()
    a = service.get_products("A")
    b = service.get_products("B")
    assert [p["name"] for p in a] == ["Pizza"]
    assert [p["name"] for p in b] == ["Sushi"]
    # Cached: a second call for A does not pick up B's data.
    assert [p["name"] for p in service.get_products("A")] == ["Pizza"]
