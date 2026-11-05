from datetime import datetime

from pydantic import BaseModel


class CertifyResult(BaseModel):
    """What Digifact returns for a certified document (API V2.0.5, nuc_json)."""
    cufe: str
    qr_url: str
    doc_guid: str
    issued_at: str
    pdf: bytes | None = None
    xml: bytes | None = None


class FiscalBlock(BaseModel):
    """orders/{id}.fiscal as exposed by the API (Timestamps become ISO strings)."""
    status: str
    numeroDF: str | None = None
    billingPoint: str | None = None
    codigoSeguridad: str | None = None
    cufe: str | None = None
    qrUrl: str | None = None
    pdfPath: str | None = None
    xmlPath: str | None = None
    docGuid: str | None = None
    issuedAt: datetime | None = None
    attempts: int = 0
    lastError: str | None = None


class FiscalConfigError(Exception):
    """A required fiscal field is missing on the org / branch / product."""

    def __init__(self, field: str):
        super().__init__(f"Configuración fiscal incompleta: falta {field}")
        self.field = field


class FiscalTotalsMismatch(Exception):
    pass
