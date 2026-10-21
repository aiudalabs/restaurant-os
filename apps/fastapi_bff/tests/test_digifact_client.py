"""Digifact client against a mocked transport. No network."""
import base64
import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.fiscal.digifact import DigifactAuthError, DigifactClient, DigifactDuplicate, DigifactError

RUC = "155704849-2-2021"


def make_client(handler, **kw):
    return DigifactClient(
        base_url="https://test.example/api",
        ruc=RUC,
        username="PICK&EAT",
        password="pw",
        transport=httpx.MockTransport(handler),
        **kw,
    )


def ok_certify():
    return {
        "code": 1,
        "message": "Proceso de certificacion realizado correctamente!",
        "authNumber": "FE0120000155704849-2-2021-3200012026102100291444430010127955734589",
        "url": "https://dgi-fep-test.mef.gob.pa:40001/Consultas/FacturasPorQR?chFE=x",
        "issuedTimeStamp": "2026-10-21T10:41:44",
        "additionalInfo": {"DocumentGUID": "D9B0AFCE"},
        "responseData1": base64.b64encode(b"<xml/>").decode(),
        "responseData3": base64.b64encode(b"%PDF-1.4").decode(),
    }


def test_token_username_format_and_header():
    seen = {}

    def handler(req: httpx.Request):
        if req.url.path.endswith("/login/get_token"):
            seen["login"] = json.loads(req.content)
            return httpx.Response(200, json={"Token": "T1", "expira_en": "x"})
        seen["auth"] = req.headers.get("Authorization")
        seen["params"] = dict(req.url.params)
        return httpx.Response(200, json=ok_certify())

    c = make_client(handler)
    r = c.certify({"Version": "1.00"})
    assert seen["login"] == {"Username": f"PA.{RUC}.PICK&EAT", "Password": "pw"}
    assert seen["auth"] == "T1"
    assert seen["params"] == {"TAXID": RUC, "FORMAT": "PDF|XML", "USERNAME": "PICK&EAT"}
    assert r.cufe.startswith("FE01")
    assert r.pdf == b"%PDF-1.4" and r.xml == b"<xml/>"
    assert r.doc_guid == "D9B0AFCE"
    assert c.token_valid()


def test_valid_cached_token_is_reused():
    calls = []

    def handler(req: httpx.Request):
        calls.append(req.url.path)
        return httpx.Response(200, json=ok_certify())

    c = make_client(handler, token="CACHED", token_expires_at=datetime.now(timezone.utc) + timedelta(days=10))
    c.certify({})
    assert calls == ["/api/v2/transform/nuc_json"]


def test_expired_token_is_refreshed_before_use():
    calls = []

    def handler(req: httpx.Request):
        calls.append(req.url.path)
        if req.url.path.endswith("get_token"):
            return httpx.Response(200, json={"Token": "NEW"})
        return httpx.Response(200, json=ok_certify())

    c = make_client(handler, token="OLD", token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1))
    c.certify({})
    assert calls[0].endswith("get_token") and c.token == "NEW"


def test_401_triggers_one_refresh_and_retry():
    calls = []

    def handler(req: httpx.Request):
        calls.append(req.url.path)
        if req.url.path.endswith("get_token"):
            return httpx.Response(200, json={"Token": "NEW"})
        if req.headers.get("Authorization") == "STALE":
            return httpx.Response(401)
        return httpx.Response(200, json=ok_certify())

    c = make_client(handler, token="STALE", token_expires_at=datetime.now(timezone.utc) + timedelta(days=10))
    c.certify({})
    assert [p.split("/")[-1] for p in calls] == ["nuc_json", "get_token", "nuc_json"]


def test_duplicate_number_is_a_distinct_error():
    def handler(req: httpx.Request):
        if req.url.path.endswith("get_token"):
            return httpx.Response(200, json={"Token": "T"})
        return httpx.Response(200, json={"code": 3000, "message": "Falló la validación de algunos escenarios.",
                                         "infoDetails": [{"evento": "R", "dCodRes": "1002", "dMsgRes": "Documento duplicado"}]})

    with pytest.raises(DigifactDuplicate):
        make_client(handler).certify({})


def test_other_codes_raise_digifact_error():
    def handler(req: httpx.Request):
        if req.url.path.endswith("get_token"):
            return httpx.Response(200, json={"Token": "T"})
        return httpx.Response(200, json={"code": 3010, "message": "Schema", "description": "CodCPBSabr invalid"})

    with pytest.raises(DigifactError) as exc:
        make_client(handler).certify({})
    assert exc.value.code == "3010" and "CodCPBSabr" in exc.value.message


def test_bad_credentials():
    def handler(req: httpx.Request):
        return httpx.Response(401)

    with pytest.raises(DigifactAuthError):
        make_client(handler).get_token()


def test_get_by_number_returns_first_row_or_none():
    def handler(req: httpx.Request):
        if req.url.path.endswith("get_token"):
            return httpx.Response(200, json={"Token": "T"})
        assert req.url.params["DATA2"] == f"STAXID|{RUC}|NUMFACT|0029144443|TIPODOC|01"
        return httpx.Response(200, json={"REQUEST_DATA": [{}], "RESPONSE": [{"CUFE": "FE01x", "ESTADO_DGI": "RECIBIDO_EXITOSAMENTE"}]})

    assert make_client(handler).get_by_number("0029144443")["CUFE"] == "FE01x"

    def empty(req: httpx.Request):
        if req.url.path.endswith("get_token"):
            return httpx.Response(200, json={"Token": "T"})
        return httpx.Response(200, json={"REQUEST_DATA": [{}], "RESPONSE": []})

    assert make_client(empty).get_by_number("0000000001") is None
