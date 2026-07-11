from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.config import settings
from app.payments.models import PaymentInitRequest, PaymentInitResponse
from app.payments.service import create_payment_link, handle_callback

router = APIRouter(prefix="/payments", tags=["payments"])


def _app_return_url(order_id: str | None) -> str:
    base = settings.customer_app_url.rstrip("/")
    return f"{base}/order/{order_id}" if order_id else base


@router.post("/init", response_model=PaymentInitResponse)
def init_payment(req: PaymentInitRequest):
    """Create a PagueloFácil payment link for an order."""
    try:
        result = create_payment_link(
            order_id=req.order_id,
            amount=req.amount,
            description=req.description,
        )
        return PaymentInitResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {e}")


@router.post("/callback")
async def payment_callback(request: Request):
    """Server-to-server callback from PagueloFácil (POST form or JSON)."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        form = await request.json()
    else:
        raw = await request.form()
        form = dict(raw)

    handle_callback(form)
    return {"status": "ok"}


@router.get("/callback")
async def payment_callback_get(request: Request):
    """Browser redirect from PagueloFácil after payment. Process the result, then
    send the customer back to their tracking screen in the web app."""
    params = dict(request.query_params)
    order_id = handle_callback(params) if params else None
    return RedirectResponse(_app_return_url(order_id), status_code=303)
