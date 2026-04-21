from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AuthUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str | None
    phone: str | None
    full_name: str | None
    email: str | None
    telegram_username: str | None
    telegram_chat_id: int | None
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserRead


class LoginRequestIn(BaseModel):
    login: str
    password: str


class LoginRequestOut(BaseModel):
    telegram_link: str
    message: str


class TelegramStartIn(BaseModel):
    start_token: str
    chat_id: int
    telegram_id: int
    telegram_username: str | None = None


class TelegramStartOut(BaseModel):
    ok: bool = True
    message_to_user: str


class LoginVerifyIn(BaseModel):
    login: str
    verification_code: str


class OwnerAdminCreate(BaseModel):
    username: str | None = None
    phone: str | None = None
    full_name: str | None = None
    email: str | None = None
    telegram_username: str | None = None
    password: str
    role: Literal["admin"] = "admin"


class OwnerAdminPatch(BaseModel):
    is_active: bool | None = None
    password: str | None = None
    username: str | None = None
    phone: str | None = None
    full_name: str | None = None
    email: str | None = None
    telegram_username: str | None = None
