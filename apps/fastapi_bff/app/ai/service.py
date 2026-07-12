"""AI build assistant — server-side execution.

The model proposes a BuildPlan; this module validates it and writes to Firestore
deterministically with orgId injected from the verified token. Only creation
happens here — nothing destructive. See docs/AI_ASSISTANT.md.
"""
from fastapi import HTTPException, status
from firebase_admin import firestore as fb_firestore

from app.config import settings
from app.core.firestore import (
    db, BRANCHES, MENUS, CATEGORIES, PRODUCTS, STATIONS, USERS,
)
from app.ai import tools
from app.ai.models import (
    ActionResult, ApplyRequest, ApplyResponse, BuildPlan,
    PlanRequest, PlanResponse, ProductRow,
)

_STATION_COLORS = ["#E23744", "#2D9CDB", "#27AE60", "#F2994A", "#9B51E0", "#EB5757"]


# ----------------------------------------------------------------- context
def load_org_context(uid: str) -> dict:
    """Resolve the caller's org/role from users/{uid}. Only owners/managers may
    drive the assistant."""
    snap = db().collection(USERS).document(uid).get()
    if not snap.exists:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Usuario sin organización.")
    u = snap.to_dict() or {}
    if u.get("role") not in ("admin", "manager"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Se requiere rol admin o manager.")
    return {
        "uid": uid,
        "orgId": u.get("orgId", ""),
        "role": u.get("role"),
        "branchIds": u.get("branchIds", []) or [],
    }


def _org_branches(org_id: str) -> list[dict]:
    docs = db().collection(BRANCHES).where("orgId", "==", org_id).stream()
    return [d.to_dict() | {"id": d.id} for d in docs]


def _context_string(org_id: str, branch: dict | None = None) -> str:
    branches = _org_branches(org_id)
    menus = [d.to_dict() | {"id": d.id} for d in
             db().collection(MENUS).where("orgId", "==", org_id).stream()]
    b = ", ".join(x.get("name", "?") for x in branches) or "(ninguna)"
    m = ", ".join(x.get("name", "?") for x in menus) or "(ninguno)"
    lines = [f"Sucursales: {b}", f"Menús existentes: {m}"]
    # Categories of the current branch's menu — so the model reuses names.
    menu_id = (branch or {}).get("menuId")
    if menu_id:
        menu_name = next((x.get("name", "?") for x in menus if x["id"] == menu_id), "?")
        cats = [(d.to_dict() or {}).get("name", "") for d in
                db().collection(CATEGORIES).where("menuId", "==", menu_id).stream()]
        lines.append(f"Menú de la sucursal actual: '{menu_name}' "
                     f"(categorías: {', '.join(c for c in cats if c) or 'ninguna'})")
    return "\n".join(lines)


def _find_menu_by_name(org_id: str, name: str) -> str | None:
    key = name.strip().lower()
    for d in db().collection(MENUS).where("orgId", "==", org_id).stream():
        if (d.to_dict() or {}).get("name", "").strip().lower() == key:
            return d.id
    return None


def _resolve_branch(org_id: str, branch_ids: list[str], branch_id: str | None) -> dict:
    branches = _org_branches(org_id)
    if not branches:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La organización no tiene sucursales.")
    if branch_id:
        match = next((x for x in branches if x["id"] == branch_id), None)
        if not match:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Sucursal no pertenece a tu organización.")
        return match
    if len(branches) == 1:
        return branches[0]
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "Tienes varias sucursales; indica en cuál trabajar antes de continuar.",
    )


def _clean_rows(rows: list[ProductRow]) -> tuple[list[ProductRow], list[str]]:
    clean, warnings = [], []
    for r in rows:
        if not r.name.strip():
            warnings.append("Se omitió un producto sin nombre.")
            continue
        if r.price < 0:
            warnings.append(f"'{r.name}' tenía precio negativo; se ajustó a 0.")
            r.price = 0.0
        clean.append(r)
    return clean, warnings


# -------------------------------------------------------------------- plan
def make_plan(uid: str, req: PlanRequest) -> PlanResponse:
    ctx = load_org_context(uid)
    branch = _resolve_branch(ctx["orgId"], ctx["branchIds"], req.branch_id)

    csv_rows, warnings = _clean_rows(req.csv_rows)
    if len(csv_rows) > settings.ai_max_csv_rows:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"El CSV supera el límite de {settings.ai_max_csv_rows} productos.",
        )

    try:
        plan = tools.generate_plan(
            message=req.message,
            context=_context_string(ctx["orgId"], branch),
            has_csv=bool(csv_rows),
            csv_count=len(csv_rows),
            history=req.history,
        )
    except Exception as exc:  # model/transport failure — surface, don't half-build
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"El asistente no respondió: {exc}")

    # CSV products are merged in deterministically (never generated by the model).
    text_rows, w2 = _clean_rows(plan.products)
    plan.products = text_rows + csv_rows
    warnings += w2

    return PlanResponse(
        plan=plan,
        target_branch_id=branch["id"],
        target_branch_name=branch.get("name", ""),
        warnings=warnings,
    )


# ------------------------------------------------------------------- apply
def apply_plan(uid: str, req: ApplyRequest) -> ApplyResponse:
    ctx = load_org_context(uid)
    org_id = ctx["orgId"]
    branch = _resolve_branch(org_id, ctx["branchIds"], req.branch_id)
    branch_id = branch["id"]
    plan: BuildPlan = req.plan
    client = db()
    now = fb_firestore.SERVER_TIMESTAMP
    results: list[ActionResult] = []
    created_menu_id: str | None = None

    # 1) Stations
    for i, name in enumerate(plan.stations):
        name = name.strip()
        if not name:
            continue
        try:
            ref = client.collection(STATIONS).document()
            ref.set({
                "id": ref.id, "orgId": org_id, "branchId": branch_id,
                "name": name, "categoryIds": [], "fcmTokens": [],
                "color": _STATION_COLORS[i % len(_STATION_COLORS)],
                "isActive": True, "createdAt": now,
            })
            results.append(ActionResult(kind="station", label=f"Estación: {name}", status="ok"))
        except Exception as exc:
            results.append(ActionResult(kind="station", label=f"Estación: {name}",
                                        status="error", detail=str(exc)))

    # 2) Resolve target menu. If the plan names a menu that already exists, reuse
    #    it (so follow-ups add to it); otherwise create it. No name → branch menu.
    target_menu_id: str | None = None
    if plan.menu and plan.menu.name.strip():
        wanted = plan.menu.name.strip()
        existing_id = _find_menu_by_name(org_id, wanted)
        if existing_id:
            target_menu_id = existing_id
            if branch.get("menuId") != existing_id:
                client.collection(BRANCHES).document(branch_id).update({"menuId": existing_id})
            results.append(ActionResult(kind="menu", label=f"Menú: {wanted} (existente)", status="ok"))
        else:
            try:
                mref = client.collection(MENUS).document()
                mref.set({"id": mref.id, "orgId": org_id, "name": wanted,
                          "isActive": True, "createdAt": now})
                client.collection(BRANCHES).document(branch_id).update({"menuId": mref.id})
                target_menu_id = created_menu_id = mref.id
                results.append(ActionResult(kind="menu", label=f"Menú: {wanted}", status="ok"))
            except Exception as exc:
                results.append(ActionResult(kind="menu", label=f"Menú: {wanted}",
                                            status="error", detail=str(exc)))
    else:
        target_menu_id = branch.get("menuId")

    needs_menu = bool(plan.products) or bool(plan.menu and plan.menu.categories)
    if needs_menu and not target_menu_id:
        results.append(ActionResult(kind="menu", label="Menú destino", status="error",
                                    detail="No hay un menú donde crear categorías/productos."))
        return _finish(results, created_menu_id)

    # 3) Categories — from the menu spec plus any distinct product category.
    cat_id_by_name: dict[str, str] = {}
    if target_menu_id:
        for d in client.collection(CATEGORIES).where("menuId", "==", target_menu_id).stream():
            data = d.to_dict() or {}
            cat_id_by_name[(data.get("name", "")).strip().lower()] = d.id

        wanted: list[str] = []
        if plan.menu:
            wanted += plan.menu.categories
        wanted += [p.category for p in plan.products if p.category.strip()]

        sort = len(cat_id_by_name)
        for raw in wanted:
            key = raw.strip().lower()
            if not key or key in cat_id_by_name:
                continue
            try:
                cref = client.collection(CATEGORIES).document()
                cref.set({"id": cref.id, "orgId": org_id, "menuId": target_menu_id,
                          "name": raw.strip(), "sortOrder": sort, "isActive": True})
                cat_id_by_name[key] = cref.id
                sort += 1
                results.append(ActionResult(kind="category", label=f"Categoría: {raw.strip()}", status="ok"))
            except Exception as exc:
                results.append(ActionResult(kind="category", label=f"Categoría: {raw.strip()}",
                                            status="error", detail=str(exc)))

    # 4) Products
    sort = 0
    for p in plan.products:
        cat_id = cat_id_by_name.get(p.category.strip().lower(), "")
        try:
            pref = client.collection(PRODUCTS).document()
            pref.set({
                "id": pref.id, "orgId": org_id, "menuId": target_menu_id,
                "categoryId": cat_id, "name": p.name.strip(),
                "description": (p.description or "").strip(),
                "price": float(p.price), "isActive": True, "sortOrder": sort,
                "tags": [], "modifierGroups": [],
            })
            sort += 1
            results.append(ActionResult(kind="product", label=f"Producto: {p.name.strip()}", status="ok"))
        except Exception as exc:
            results.append(ActionResult(kind="product", label=f"Producto: {p.name.strip()}",
                                        status="error", detail=str(exc)))

    return _finish(results, created_menu_id)


def _finish(results: list[ActionResult], created_menu_id: str | None) -> ApplyResponse:
    ok = sum(1 for r in results if r.status == "ok")
    err = sum(1 for r in results if r.status == "error")
    return ApplyResponse(results=results, created_menu_id=created_menu_id,
                         ok_count=ok, error_count=err)
