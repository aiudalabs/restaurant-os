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
    image_url: str | None = None


class MenuSpec(BaseModel):
    name: str
    categories: list[str] = Field(default_factory=list)


class TableSpec(BaseModel):
    count: int = 0            # how many tables to create
    capacity: int = 4         # seats per table
    zone: str | None = None   # e.g. "Terraza"


class BuildPlan(BaseModel):
    """What the model proposes to build. Products from an uploaded CSV are merged
    in server-side (deterministic); products the model itself lists come from the
    owner asking to generate a menu with prices."""

    summary: str = ""
    stations: list[str] = Field(default_factory=list)
    menu: MenuSpec | None = None
    products: list[ProductRow] = Field(default_factory=list)
    tables: TableSpec | None = None


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class PlanRequest(BaseModel):
    message: str
    branch_id: str | None = None
    csv_rows: list[ProductRow] = Field(default_factory=list)
    # Recent conversation so the model can resolve follow-ups ("ahora agrégale…").
    history: list[ChatTurn] = Field(default_factory=list)


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
