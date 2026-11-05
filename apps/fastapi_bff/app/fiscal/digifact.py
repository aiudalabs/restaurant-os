"""Digifact Panamá REST client (API V2.0.5, NUC V2.0.8).

Docs: https://documentacion.digifact.com/pa/api.md. Verified against the test
environment on 2026-10-21 (see docs/DIGIFACT_EVALUATION.md §2).

Only this module talks HTTP to Digifact; the NUC document itself is built in
nuc.py and the orchestration (numbering, Firestore, Storage) lives in service.py.
"""
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.fiscal.models import CertifyResult

logger = logging.getLogger(__name__)

TOKEN_TTL = timedelta(days=30)
# Digifact refreshes nothing: a token simply dies after 30 days. Renew a bit earlier.
TOKEN_SAFETY = timedelta(days=1)


class DigifactError(Exception):
    def __init__(self, code: str, message: str, details: list[dict[str, Any]] | None = None):
        super().__init__(f"Digifact {code}: {message}")
        self.code = code
        self.message = message
        self.details = details or []


class DigifactDuplicate(DigifactError):
    """Code 3000 with dCodRes 1002: a document with this NumeroDF already exists."""


class DigifactAuthError(DigifactError):
    pass


def _decode(b64: str | None) -> bytes | None:
    if not b64:
        return None
    return base64.b64decode(b64)


class DigifactClient:
    def __init__(
        self,
        base_url: str,
        ruc: str,
        username: str,
        password: str,
        token: str | None = None,
        token_expires_at: datetime | None = None,
        transport: httpx.BaseTransport | None = None,
        timeout: float = 60.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.ruc = ruc
        self.username = username
        self._password = password
        self.token = token
        self.token_expires_at = token_expires_at
        self._http = httpx.Client(transport=transport, timeout=timeout)

    # ── auth ────────────────────────────────────────────────────────────────

    @property
    def login_username(self) -> str:
        return f"PA.{self.ruc}.{self.username}"

    def token_valid(self) -> bool:
        if not self.token or not self.token_expires_at:
            return False
        return datetime.now(timezone.utc) < self.token_expires_at - TOKEN_SAFETY

    def get_token(self) -> tuple[str, datetime]:
        resp = self._http.post(
            f"{self.base_url}/login/get_token",
            json={"Username": self.login_username, "Password": self._password},
        )
        if resp.status_code == 401:
            raise DigifactAuthError("401", "Credenciales de Digifact rechazadas")
        resp.raise_for_status()
        body = resp.json()
        token = body.get("Token")
        if not token:
            raise DigifactAuthError("401", f"Digifact no devolvió token: {body}")
        self.token = token
        self.token_expires_at = datetime.now(timezone.utc) + TOKEN_TTL
        return token, self.token_expires_at

    def _auth_headers(self) -> dict[str, str]:
        if not self.token_valid():
            self.get_token()
        return {"Authorization": self.token or ""}

    def _request(self, method: str, path: str, **kw: Any) -> httpx.Response:
        """One request with a single retry on 401 (expired token)."""
        resp = self._http.request(method, f"{self.base_url}{path}", headers=self._auth_headers(), **kw)
        if resp.status_code == 401:
            self.get_token()
            resp = self._http.request(method, f"{self.base_url}{path}", headers={"Authorization": self.token or ""}, **kw)
        return resp

    # ── documents ───────────────────────────────────────────────────────────

    def certify(self, nuc: dict[str, Any], formats: str = "PDF|XML") -> CertifyResult:
        resp = self._request(
            "POST",
            "/v2/transform/nuc_json",
            params={"TAXID": self.ruc, "FORMAT": formats, "USERNAME": self.username},
            json=nuc,
        )
        if resp.status_code == 401:
            raise DigifactAuthError("401", "No autorizado")
        resp.raise_for_status()
        body = resp.json()
        code = str(body.get("code", ""))
        if code != "1":
            details = body.get("infoDetails") or []
            if code == "3000" and any(str(d.get("dCodRes")) == "1002" for d in details):
                raise DigifactDuplicate(code, body.get("message", "Documento duplicado"), details)
            raise DigifactError(code, f"{body.get('message', '')} {body.get('description', '')}".strip()[:900], details)
        additional = body.get("additionalInfo") or {}
        return CertifyResult(
            cufe=body.get("authNumber", ""),
            qr_url=body.get("url", ""),
            doc_guid=additional.get("DocumentGUID", ""),
            issued_at=body.get("issuedTimeStamp", ""),
            pdf=_decode(body.get("responseData3")),
            xml=_decode(body.get("responseData1")),
        )

    def get_by_number(self, numero_df: str, doc_type: str = "01") -> dict[str, Any] | None:
        """Looks a document up by its fiscal number (recovery after a lost response)."""
        resp = self._request(
            "GET",
            "/SHAREDINFO",
            params={
                "TRANSACTION": "SHARED_INFO_EFACE",
                "RUC": self.ruc,
                "DATA1": "SHARED_GETDTEINFO_BYNUMDOC",
                "DATA2": f"STAXID|{self.ruc}|NUMFACT|{numero_df}|TIPODOC|{doc_type}",
                "USERNAME": self.username,
            },
        )
        resp.raise_for_status()
        rows = resp.json().get("RESPONSE") or []
        return rows[0] if rows else None

    def get_document(self, cufe: str, formats: str = "PDF|XML") -> tuple[bytes | None, bytes | None]:
        resp = self._request(
            "GET",
            "/GetDocument",
            params={"CUFE": cufe, "RUC": self.ruc, "FORMAT": formats, "USERNAME": self.username},
        )
        resp.raise_for_status()
        rows = resp.json().get("RESPONSE") or []
        if not rows:
            return None, None
        return _decode(rows[0].get("ResponseData3")), _decode(rows[0].get("ResponseData1"))

    def cancel(self, cufe: str, reason: str) -> bool:
        """Anula una FE. Per Digifact's docs this only works with production credentials."""
        resp = self._request(
            "POST",
            "/CancelFePA",
            json={"Taxid": self.ruc, "Cufe": cufe, "Motivo": reason, "Username": self.username},
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("Anulado"):
            raise DigifactError(str(body.get("Codigo", "")), body.get("Mensaje", "No se pudo anular"))
        return True

    def info_ruc(self, ruc: str, tipo: str = "2") -> dict[str, Any]:
        resp = self._request("GET", "/GetInfoRuc", params={"RUC": ruc, "TIPO": tipo})
        resp.raise_for_status()
        return resp.json()
