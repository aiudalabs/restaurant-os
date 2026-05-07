from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class EmployeeInfo(BaseModel):
    id: int
    name: str
    role: str
    branch_id: str
    org_id: str


class LoginResponse(BaseModel):
    firebase_token: str
    employee: EmployeeInfo
