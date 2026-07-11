import logging
import time
import xmlrpc.client
from dataclasses import dataclass
from functools import wraps
from typing import Any

from app.core.exceptions import OdooAuthError, OdooRPCError
from app.config import settings

logger = logging.getLogger(__name__)

_RETRY_ATTEMPTS = 3
_RETRY_BACKOFF = [1, 2, 4]  # seconds


@dataclass(frozen=True)
class OdooConfig:
    """Connection to ONE tenant's Odoo. Multi-tenant: each org has its own."""
    url: str
    db: str
    user: str
    password: str

    @classmethod
    def from_env(cls) -> "OdooConfig":
        return cls(
            url=settings.odoo_url,
            db=settings.odoo_db,
            user=settings.odoo_user,
            password=settings.odoo_password,
        )


def _with_retry(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        last_exc = None
        for attempt, delay in enumerate(_RETRY_BACKOFF):
            try:
                return fn(*args, **kwargs)
            except (ConnectionRefusedError, TimeoutError, OSError) as e:
                last_exc = e
                if attempt < _RETRY_ATTEMPTS - 1:
                    time.sleep(delay)
        raise OdooRPCError(f"Odoo unreachable after {_RETRY_ATTEMPTS} attempts: {last_exc}")
    return wrapper


class OdooClient:
    def __init__(self, config: OdooConfig | None = None):
        cfg = config or OdooConfig.from_env()
        self._url = cfg.url
        self._db = cfg.db
        self._user = cfg.user
        self._password = cfg.password
        self._uid: int | None = None

    @property
    def _common(self):
        return xmlrpc.client.ServerProxy(f"{self._url}/xmlrpc/2/common")

    @property
    def _models(self):
        return xmlrpc.client.ServerProxy(f"{self._url}/xmlrpc/2/object")

    @_with_retry
    def authenticate(self, username: str | None = None, password: str | None = None) -> int:
        u = username or self._user
        p = password or self._password
        try:
            uid = self._common.authenticate(self._db, u, p, {})
        except Exception as e:
            raise OdooRPCError(f"Odoo RPC error during authenticate: {e}") from e
        if not uid:
            raise OdooAuthError(f"Invalid credentials for user '{u}'")
        if username is None:
            self._uid = uid
        return uid

    def _ensure_uid(self) -> int:
        if self._uid is None:
            self.authenticate()
        return self._uid  # type: ignore[return-value]

    @_with_retry
    def search_read(
        self,
        model: str,
        domain: list,
        fields: list[str],
        limit: int = 0,
        offset: int = 0,
        order: str = "",
    ) -> list[dict]:
        uid = self._ensure_uid()
        kwargs: dict[str, Any] = {"fields": fields}
        if limit:
            kwargs["limit"] = limit
        if offset:
            kwargs["offset"] = offset
        if order:
            kwargs["order"] = order
        try:
            return self._models.execute_kw(
                self._db, uid, self._password,
                model, "search_read",
                [domain], kwargs,
            )
        except xmlrpc.client.Fault as e:
            raise OdooRPCError(f"search_read on {model} failed: {e.faultString}") from e

    @_with_retry
    def create(self, model: str, values: dict) -> int:
        uid = self._ensure_uid()
        try:
            return self._models.execute_kw(
                self._db, uid, self._password,
                model, "create", [values],
            )
        except xmlrpc.client.Fault as e:
            raise OdooRPCError(f"create on {model} failed: {e.faultString}") from e

    @_with_retry
    def write(self, model: str, ids: list[int], values: dict) -> bool:
        uid = self._ensure_uid()
        try:
            return self._models.execute_kw(
                self._db, uid, self._password,
                model, "write", [ids, values],
            )
        except xmlrpc.client.Fault as e:
            raise OdooRPCError(f"write on {model} failed: {e.faultString}") from e

    @_with_retry
    def call(self, model: str, method: str, args: list, kwargs: dict | None = None) -> Any:
        uid = self._ensure_uid()
        try:
            return self._models.execute_kw(
                self._db, uid, self._password,
                model, method, args, kwargs or {},
            )
        except xmlrpc.client.Fault as e:
            raise OdooRPCError(f"{model}.{method} failed: {e.faultString}") from e

    def ping(self) -> bool:
        try:
            self._common.version()
            return True
        except Exception:
            return False


# Env-based client — the single-tenant fallback (and dev default).
odoo_client = OdooClient()


def resolve_odoo_config(org_id: str | None) -> OdooConfig | None:
    """Reads a tenant's Odoo connection from organizations/{orgId}.

    Only Cloud Functions / the BFF (Admin SDK) can read the org doc, which holds
    these credentials. Returns None if the org has no Odoo configured (a brand-new
    tenant that hasn't connected Odoo yet) — callers then skip Odoo gracefully.
    """
    if not org_id:
        return None
    # Local import avoids a circular import at module load.
    from app.core.firestore import db

    try:
        snap = db().collection("organizations").document(org_id).get()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not read org %s for Odoo config: %s", org_id, exc)
        return None
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    url = data.get("odooUrl")
    odb = data.get("odooDb")
    user = data.get("odooUser")
    password = data.get("odooPassword")
    if url and odb and user and password:
        return OdooConfig(url=url, db=odb, user=user, password=password)
    return None


def odoo_client_for_org(org_id: str | None) -> OdooClient | None:
    """Odoo client for a specific org. Falls back to the env client when a single
    org is configured there; returns None if no Odoo is available for this tenant."""
    cfg = resolve_odoo_config(org_id)
    if cfg is not None:
        return OdooClient(cfg)
    # Fallback: env-configured Odoo (single-tenant deploy). If neither is set,
    # there is simply no Odoo for this org.
    if settings.odoo_url and settings.odoo_db:
        return OdooClient()
    return None
