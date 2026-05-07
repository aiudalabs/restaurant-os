from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.models import LoginRequest, LoginResponse
from app.auth.service import login
from app.core.exceptions import OdooAuthError, OdooRPCError
from app.core.firebase import revoke_refresh_tokens
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def auth_login(body: LoginRequest):
    try:
        token, employee = login(body.username, body.password)
    except OdooAuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    except OdooRPCError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    return LoginResponse(firebase_token=token, employee=employee)


@router.get("/me")
def auth_me(user: dict = Depends(get_current_user)):
    return {
        "uid": user.get("uid"),
        "role": user.get("role"),
        "org_id": user.get("org_id"),
        "branch_id": user.get("branch_id"),
        "odoo_uid": user.get("odoo_uid"),
        "odoo_employee_id": user.get("odoo_employee_id"),
    }


@router.post("/logout", status_code=204)
def auth_logout(user: dict = Depends(get_current_user)):
    try:
        revoke_refresh_tokens(user["uid"])
    except Exception:
        pass
