from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    # Multi-tenant: which organization this employee belongs to. Optional — falls
    # back to the BFF's configured org (single-tenant deploy).
    org_id: str | None = None
    branch_id: str | None = None


class EmployeeInfo(BaseModel):
    id: int
    name: str
    role: str
    branch_id: str
    org_id: str


class LoginResponse(BaseModel):
    firebase_token: str
    employee: EmployeeInfo
