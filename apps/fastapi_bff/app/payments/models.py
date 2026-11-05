from pydantic import BaseModel


class PaymentInitRequest(BaseModel):
    order_id: str
    # Kept for backwards compatibility with deployed clients; IGNORED. The amount
    # and description come from the order itself (never from the browser).
    amount: float | None = None
    description: str | None = None


class PaymentInitResponse(BaseModel):
    payment_url: str
    payment_code: str
