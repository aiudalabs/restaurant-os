from pydantic import BaseModel


class PaymentInitRequest(BaseModel):
    order_id: str
    amount: float
    description: str


class PaymentInitResponse(BaseModel):
    payment_url: str
    payment_code: str
