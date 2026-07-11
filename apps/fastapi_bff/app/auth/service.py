from app.config import settings
from app.core.exceptions import OdooAuthError, OdooRPCError
from app.core.firebase import create_custom_token
from app.core.firestore import USERS, db
from app.core.odoo import odoo_client_for_org
from app.auth.models import EmployeeInfo

_ROLE_MAP = {
    "mesero": "waiter",
    "waiter": "waiter",
    "camarero": "waiter",
    "cocinero": "kitchen",
    "kitchen": "kitchen",
    "cocina": "kitchen",
    "gerente": "manager",
    "manager": "manager",
}


def _map_role(job_title: str | None) -> str:
    if not job_title:
        return "operator"
    lower = job_title.lower()
    for keyword, role in _ROLE_MAP.items():
        if keyword in lower:
            return role
    return "operator"


def _first_branch_of_org(org_id: str) -> str | None:
    try:
        docs = list(
            db().collection("branches").where("orgId", "==", org_id).limit(1).stream()
        )
        return docs[0].id if docs else None
    except Exception:
        return None


def login(
    username: str,
    password: str,
    org_id: str | None = None,
    branch_id: str | None = None,
) -> tuple[str, EmployeeInfo]:
    # Resolve which tenant this login is for (falls back to the configured org).
    resolved_org = org_id or settings.org_id
    client = odoo_client_for_org(resolved_org)
    if client is None:
        raise OdooAuthError(f"No hay Odoo configurado para la organización '{resolved_org}'")

    uid = client.authenticate(username, password)

    try:
        employees = client.search_read(
            "hr.employee",
            [["user_id.login", "=", username], ["active", "=", True]],
            ["id", "name", "job_title"],
            limit=1,
        )
    except OdooRPCError:
        # HR module not installed — fall through to uid-based fallback
        employees = []

    if employees:
        emp = employees[0]
        emp_id: int = emp["id"]
        name: str = emp["name"]
        role = _map_role(emp.get("job_title"))
    else:
        emp_id = uid
        name = username
        role = "manager"

    branch = branch_id or _first_branch_of_org(resolved_org) or settings.branch_id

    firebase_uid = f"odoo_{uid}"
    claims = {
        "odoo_uid": uid,
        "odoo_employee_id": emp_id,
        "role": role,
        "branch_id": branch,
        "org_id": resolved_org,
    }
    token = create_custom_token(firebase_uid, claims)

    # Upsert user doc so Firestore security rules (which read users/{uid}) work
    db().collection(USERS).document(firebase_uid).set({
        "orgId": resolved_org,
        "branchIds": [branch],
        "role": role,
        "displayName": name,
        "isActive": True,
    }, merge=True)

    employee = EmployeeInfo(
        id=emp_id,
        name=name,
        role=role,
        branch_id=branch or "",
        org_id=resolved_org,
    )
    return token, employee
