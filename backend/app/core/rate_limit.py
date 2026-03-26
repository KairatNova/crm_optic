"""Простой in-memory rate limit по IP для публичных эндпоинтов (MVP)."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

_lock = Lock()
_timestamps: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit_public_booking(request: Request, *, max_requests: int = 20, window_seconds: int = 60) -> None:
    """Не более max_requests запросов с одного IP за window_seconds."""
    ip = _client_ip(request)
    now = time.monotonic()
    with _lock:
        bucket = _timestamps[ip]
        bucket[:] = [t for t in bucket if now - t < window_seconds]
        if len(bucket) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many booking requests. Try again later.",
            )
        bucket.append(now)
