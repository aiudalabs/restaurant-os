import time
import xmlrpc.client
from functools import wraps
from typing import Any

from app.core.exceptions import OdooAuthError, OdooRPCError
from app.config import settings

_RETRY_ATTEMPTS = 3
_RETRY_BACKOFF = [1, 2, 4]  # seconds


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
    def __init__(self):
        self._url = settings.odoo_url
        self._db = settings.odoo_db
        self._user = settings.odoo_user
        self._password = settings.odoo_password
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


odoo_client = OdooClient()
