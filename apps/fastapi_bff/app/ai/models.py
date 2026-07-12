"""Pydantic contracts for the AI build assistant.

The model NEVER writes to Firestore. It only produces a BuildPlan (natural
language → structured intent). The service executes the plan deterministically
with the caller's orgId injected server-side. See docs/AI_ASSISTANT.md.
"""
from pydantic import BaseModel, Field


class ProductRow(BaseModel):
    name: str
    price: float = 0.0
    category: str = ""
    description: str | None = None


class MenuSpec(BaseModel):
    name: str
    categories: list[str] = Field(default_factory=list)


class BuildPlan(BaseModel):
    """What the model proposes to build. Products dictated in free text land in
    `products`; bulk products from an uploaded CSV are merged in server-side and
    are NOT produced by the model (avoids hallucinated prices)."""

    summary: str = ""
    stations: list[str] = Field(default_factory=list)
    menu: MenuSpec | None = None
    products: list[ProductRow] = Field(default_factory=list)


class PlanRequest(BaseModel):
    message: str
    branch_id: str | None = None
    csv_rows: list[ProductRow] = Field(default_factory=list)


class PlanResponse(BaseModel):
    plan: BuildPlan
    target_branch_id: str | None = None
    target_branch_name: str | None = None
    warnings: list[str] = Field(default_factory=list)


class ApplyRequest(BaseModel):
    plan: BuildPlan
    branch_id: str | None = None


class ActionResult(BaseModel):
    kind: str          # "station" | "menu" | "category" | "product"
    label: str         # human-readable ("Estación: Cocina")
    status: str        # "ok" | "error" | "skipped"
    detail: str = ""


class ApplyResponse(BaseModel):
    results: list[ActionResult]
    created_menu_id: str | None = None
    ok_count: int = 0
    error_count: int = 0
