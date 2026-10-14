"""Contracts of the Zaveli calls (Zaveli integration guide, steps 4 and 8).

The call body, its context and the reply are fixed by Zaveli; the tool arguments
are ours (they mirror tools/*.json, which is what Zaveli validates against).
"""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["CONFIRMED", "REJECTED", "PENDING", "UNKNOWN"]


class CallContext(BaseModel):
    # Zaveli adds fields over time (locale, contact…): accept and ignore them.
    model_config = ConfigDict(extra="ignore")

    business_id: str = Field(min_length=1)
    business_ref: str | None = None
    conversation_id: str | None = None
    conformance: bool = False


class ToolCall(BaseModel):
    model_config = ConfigDict(extra="ignore")

    operation_id: str = Field(min_length=1)
    tool: str
    arguments: dict[str, Any]
    context: CallContext


class Amount(BaseModel):
    value: str  # decimal string, ^[0-9]{1,12}(\.[0-9]{1,4})?$
    currency: str


class ToolReply(BaseModel):
    status: Status
    message_code: str
    reference: str | None = None
    data: dict[str, Any] | None = None
    amounts: list[Amount] | None = None  # only with CONFIRMED
    already_done: bool | None = None  # only with CONFIRMED

    def to_bytes(self) -> bytes:
        return self.model_dump_json(exclude_none=True).encode()


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event_id: str = Field(min_length=1)
    type: str
    business_ref: str | None = None
    occurred_at: str | None = None


# ── Tool arguments ─────────────────────────────────────────────────────────────

class NoArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateOrderArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # One menu code per unit (Zaveli schemas only allow lists of simple types).
    productos: list[Annotated[str, Field(min_length=1, max_length=60)]] = Field(min_length=1, max_length=20)
    nombre: str | None = Field(default=None, max_length=60)
    notas: str | None = Field(default=None, max_length=200)


class OrderStatusArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pedido: str = Field(min_length=1, max_length=20)
