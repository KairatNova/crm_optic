from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TelegramAuthUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None
    email: str | None
    role: str
    telegram_id: int | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: TelegramAuthUser


class CRMUserCreate(BaseModel):
    telegram_id: int = Field(..., description="Числовой ID из @userinfobot")
    full_name: str | None = None
    email: str | None = None
    role: Literal["admin", "doctor"] = "admin"
