from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.firebase import verify_id_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        return verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def require_role(*roles: str):
    def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user
    return dependency


def org_of(user: dict) -> str | None:
    """Tenant of a verified token. Staff tokens (Firebase custom claims set by
    syncStaffClaims) carry `orgId`; tokens minted by the BFF's own /auth/login
    carry `org_id`. Accept both."""
    return user.get("orgId") or user.get("org_id")


def branch_of(user: dict) -> str | None:
    return user.get("branchId") or user.get("branch_id")


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Server-to-server calls (Cloud Functions → BFF). The token is a shared
    secret (INTERNAL_TOKEN on the BFF, BFF_INTERNAL_TOKEN in Functions). An
    empty setting refuses every call."""
    import hmac

    from app.config import settings

    expected = settings.internal_token
    if not expected or not x_internal_token or not hmac.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal token")
