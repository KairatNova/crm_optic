import time
from typing import Any

import jwt

from app.core.config import get_settings


def create_access_token(*, user_id: int, role: str, username: str) -> str:
    settings = get_settings()
    now = int(time.time())
    exp = now + settings.jwt_expire_minutes * 60
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "username": username,
        "iat": now,
        "exp": exp,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
