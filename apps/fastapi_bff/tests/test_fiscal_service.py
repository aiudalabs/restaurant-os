"""issue_invoice state machine with a fake Digifact client and fake Firestore/Storage."""
from datetime import datetime, timedelta, timezone

import pytest

from app.fiscal import service
from app.fiscal.digifact import DigifactDuplicate, DigifactError
from app.fiscal.models import CertifyResult
from tests.test_nuc import BRANCH, ORG, PRODUCTS

TZ = timezone(timedelta(hours=-5))


class FakeRef:
    def __init__(self):
        self.patches = []

    def update(self, data):
        self.patches.append(data)

    @property
    def fiscal(self):
        out = {}
        for p in self.patches:
            for k, v in p.items():
                if k.startswith("fiscal."):
                    out[k[7:]] = v
        return out


class FakeClient:
    def __init__(self, behaviour="ok", found=None, ruc_info=None):
        self.behaviour, self.found, self.ruc_info = behaviour, found, ruc_info
        self.token, self.token_expires_at = "T", datetime.now(timezone.utc) + timedelta(days=10)
        self.calls = []

    def token_valid(self):
        return True

    def certify(self, nuc):
        self.calls.append(("certify", nuc))
        if self.behaviour == "dup":
            raise DigifactDuplicate("3000", "dup", [{"dCodRes": "1002"}])
        if self.behaviour == "error":
            raise DigifactError("3010", "schema bad")
        return CertifyResult(cufe="FE01-NEW", qr_url="https://dgi/qr", doc_guid="G1", issued_at="x", pdf=b"%PDF", xml=b"<x/>")

    def get_by_number(self, numero_df, doc_type="01"):
        self.calls.append(("lookup", numero_df))
        return self.found

    def get_document(self, cufe, formats="PDF|XML"):
        return b"%PDF-old", None

    def info_ruc(self, ruc, tipo="2"):
        self.calls.append(("info_ruc", ruc, tipo))
        return self.ruc_info or {"Ok": False}


@pytest.fixture
def env(monkeypatch):
    def make(order, items=None, org=ORG, branch=BRANCH, client=None):
        ref = FakeRef()
        items = items if items is not None else [{"productId": "pz", "productName": "Pizza", "quantity": 2, "unitPrice": 10}]
        monkeypatch.setattr(service, "_load", lambda oid: (ref, order, items, org, branch, PRODUCTS))
        numbers = iter(["0000000007", "0000000008"])
        monkeypatch.setattr(service, "_allocate_number", lambda bid: next(numbers))
        uploads = []
        monkeypatch.setattr(service, "_upload", lambda path, data, ct: uploads.append((path, ct)) or f"https://storage/{path}")
        c = client or FakeClient()
        res = service.issue_invoice("o1", client_factory=lambda org_id, org_doc: c, now=datetime(2026, 10, 21, 10, 0, tzinfo=TZ))
        return ref, c, uploads, res
    return make


def paid(**over):
    return {"orgId": "A", "branchId": "b", "total": 21.4, "taxAmount": 1.4, "subtotal": 20,
            "payment": {"method": "cash", "status": "paid"}, **over}


def test_skipped_when_org_fiscal_disabled(env):
    ref, c, uploads, res = env(paid(), org={"fiscal": {"enabled": False}})
    assert res["status"] == "skipped" and ref.fiscal["status"] == "skipped" and c.calls == []


def test_success_allocates_number_persists_before_certify_and_stores_files(env):
    ref, c, uploads, res = env(paid())
    assert ref.patches[0]["fiscal.status"] == "issuing" and ref.patches[0]["fiscal.numeroDF"] == "0000000007"
    assert len(ref.patches[0]["fiscal.codigoSeguridad"]) == 9
    nuc = c.calls[0][1]
    assert {i["Name"]: i["Value"] for i in nuc["Header"]["AdditionalIssueDocInfo"]}["NumeroDF"] == "0000000007"
    assert res["status"] == "issued" and res["cufe"] == "FE01-NEW"
    assert ref.fiscal["status"] == "issued" and ref.fiscal["pdfPath"] == "orgs/A/invoices/FE01-NEW.pdf"
    assert ref.fiscal["pdfUrl"].startswith("https://storage/")
    assert [u[0] for u in uploads] == ["orgs/A/invoices/FE01-NEW.pdf", "orgs/A/invoices/FE01-NEW.xml"]
    assert ref.fiscal["attempts"] == 1


def test_already_issued_is_idempotent(env):
    existing = {"status": "issued", "cufe": "FE01-OLD", "attempts": 1}
    ref, c, uploads, res = env(paid(fiscal=existing))
    assert res == existing and c.calls == [] and ref.patches == []


def test_retry_reuses_the_number(env):
    ref, c, uploads, res = env(paid(fiscal={"status": "error", "numeroDF": "0000000003", "codigoSeguridad": "111111111", "attempts": 1, "lastError": "x"}))
    nuc = c.calls[0][1]
    info = {i["Name"]: i["Value"] for i in nuc["Header"]["AdditionalIssueDocInfo"]}
    assert info["NumeroDF"] == "0000000003" and info["CodigoSeguridad"] == "111111111"
    assert res["status"] == "issued" and ref.fiscal["attempts"] == 2


def test_digifact_error_keeps_number_and_records_error(env):
    ref, c, uploads, res = env(paid(), client=FakeClient("error"))
    assert res["status"] == "error" and "3010" in res["lastError"]
    assert ref.fiscal["status"] == "error" and ref.fiscal["numeroDF"] == "0000000007"
    assert uploads == []


def test_duplicate_is_reconciled_by_lookup(env):
    ref, c, uploads, res = env(paid(), client=FakeClient("dup", found={"CUFE": "FE01-FOUND", "GUID": "G9"}))
    assert [k for k, _ in c.calls] == ["certify", "lookup"]
    assert res["status"] == "issued" and res["cufe"] == "FE01-FOUND"
    assert ref.fiscal["pdfPath"] == "orgs/A/invoices/FE01-FOUND.pdf"


def test_duplicate_without_lookup_hit_is_an_error(env):
    ref, c, uploads, res = env(paid(), client=FakeClient("dup", found=None))
    assert res["status"] == "error" and ref.fiscal["numeroDF"] == "0000000007"


def test_unpaid_order_is_refused(env):
    ref, c, uploads, res = env(paid(payment={"method": None, "status": "pending"}))
    assert res["status"] == "error" and "pagado" in res["lastError"] and c.calls == []


def test_missing_config_is_a_recorded_error_not_an_exception(env):
    org = {"fiscal": {**ORG["fiscal"], "defaultCpbsAbr": "", "defaultCpbsCmp": ""}}
    ref, c, uploads, res = env(paid(), org=org)
    assert res["status"] == "error" and "cpbs" in res["lastError"] and c.calls == []


def test_ruc_receiver_gets_dv_and_name_from_the_dgi(env):
    c = FakeClient(ruc_info={"Ok": True, "Ruc": "155704849-2-2021", "Nombre": "DIGIFACT SERVICIOS, S.A.", "DV": "32", "TipoRuc": "2"})
    ref, c, uploads, res = env(paid(invoiceRequest={"receiverType": "01", "taxId": "155704849-2-2021", "name": "Consumidor Final"}), client=c)
    assert res["status"] == "issued"
    nuc = c.calls[-1][1]
    assert nuc["Buyer"]["TaxID"] == "155704849-2-2021" and nuc["Buyer"]["Name"] == "DIGIFACT SERVICIOS, S.A."
    assert {i["Name"]: i["Value"] for i in nuc["Buyer"]["TaxIDAdditionalInfo"]}["DigitoVerificador"] == "32"
    assert nuc["Buyer"]["TaxIDType"] == "2"


def test_unknown_ruc_falls_back_to_consumidor_final_with_note(env):
    c = FakeClient(ruc_info={"Ok": False})
    ref, c, uploads, res = env(paid(invoiceRequest={"receiverType": "01", "taxId": "9-9-9", "name": "Ana"}), client=c)
    assert res["status"] == "issued" and "no encontrado" in res["receiverNote"]
    nuc = c.calls[-1][1]
    assert nuc["Buyer"]["TaxID"] == "CF" and nuc["Buyer"]["Name"] == "Ana"
    assert [k for k, *_ in c.calls].count("info_ruc") == 2


def test_name_only_is_consumidor_final_con_nombre(env):
    ref, c, uploads, res = env(paid(invoiceRequest={"receiverType": "02", "taxId": "CF", "name": "Ivo Pérez"}))
    nuc = c.calls[-1][1]
    assert nuc["Buyer"]["TaxID"] == "CF" and nuc["Buyer"]["Name"] == "Ivo Pérez"
    assert not any(k == "info_ruc" for k, *_ in c.calls)
