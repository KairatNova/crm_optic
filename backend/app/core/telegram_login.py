"""Verify Telegram Login Widget callback (https://core.telegram.org/widgets/login)."""

import hashlib
import hmac
import time
from typing import Any


def verify_telegram_login(auth_data: dict[str, Any], bot_token: str, max_age_seconds: int = 86400) -> bool:
    """
    auth_data: query params as dict (values may be str).
    Must contain 'hash' and 'auth_date'; 'hash' is removed for the check string.
    """
    check_hash = auth_data.get("hash")
    if not check_hash or not bot_token:
        return False

    auth_date = auth_data.get("auth_date")
    if auth_date is None:
        return False
    try:
        ts = int(auth_date)
    except (TypeError, ValueError):
        return False
    if time.time() - ts > max_age_seconds:
        return False

    data = {k: v for k, v in auth_data.items() if k != "hash" and v is not None and v != ""}
    data_check_string = "\n".join(f"{k}={data[k]}" for k in sorted(data.keys()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, str(check_hash))
