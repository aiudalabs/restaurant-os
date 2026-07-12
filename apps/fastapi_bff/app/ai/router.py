"""AI build assistant endpoints.

POST /ai/plan   → propose a BuildPlan (no writes)
POST /ai/apply  → execute a confirmed plan (creation only)

Both require a Firebase ID token; orgId/role come from users/{uid}.
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.ai import service
from app.ai.models import ApplyRequest, ApplyResponse, PlanRequest, PlanResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest, user: dict = Depends(get_current_user)) -> PlanResponse:
    return service.make_plan(user["uid"], req)


@router.post("/apply", response_model=ApplyResponse)
def apply(req: ApplyRequest, user: dict = Depends(get_current_user)) -> ApplyResponse:
    return service.apply_plan(user["uid"], req)
