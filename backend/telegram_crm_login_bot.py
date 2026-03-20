import asyncio
import os
import re
from typing import Any

import httpx

from app.core.config import get_settings


def _telegram_api_base() -> str:
    return "https://api.telegram.org"


def _read_backend_api_base() -> str:
    # В проекте backend обычно поднимается локально на BACKEND_PORT (см. backend/.env).
    port = os.getenv("BACKEND_PORT", "8000")
    return f"http://127.0.0.1:{port}"


def _start_token_from_text(text: str) -> str | None:
    # Обычно Telegram присылает: "/start <token>"
    parts = text.strip().split()
    if len(parts) < 2:
        return None
    return parts[1]


async def main() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is missing")

    api_base = _read_backend_api_base()
    bot_token = settings.telegram_bot_token

    telegram_api = _telegram_api_base()
    offset = 0
    headers_for_backend = {}
    if settings.telegram_bot_webhook_secret:
        headers_for_backend["X-Bot-Secret"] = settings.telegram_bot_webhook_secret

    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            try:
                r = await client.get(
                    f"{telegram_api}/bot{bot_token}/getUpdates",
                    params={"offset": offset, "timeout": 30},
                )
                r.raise_for_status()
                payload: dict[str, Any] = r.json()
                if not payload.get("ok"):
                    await asyncio.sleep(1)
                    continue

                for update in payload.get("result", []) or []:
                    update_id = update.get("update_id")
                    if isinstance(update_id, int):
                        offset = update_id + 1

                    message = update.get("message") or update.get("edited_message") or {}
                    text = message.get("text") or ""
                    if not text.startswith("/start"):
                        continue

                    start_token = _start_token_from_text(text)
                    if not start_token:
                        continue

                    chat = message.get("chat") or {}
                    chat_id = chat.get("id")
                    from_user = message.get("from") or {}
                    telegram_username = from_user.get("username")

                    if not isinstance(chat_id, int):
                        continue

                    # 1) Call backend to bind chat and get login code message.
                    start_resp = await client.post(
                        f"{api_base}/auth/telegram/start",
                        json={
                            "start_token": start_token,
                            "chat_id": chat_id,
                            "telegram_username": telegram_username,
                        },
                        headers=headers_for_backend,
                    )
                    if start_resp.status_code >= 400:
                        # If backend returns 4xx, we just ignore and wait for next update.
                        continue
                    start_out = start_resp.json()
                    message_to_user = start_out.get("message_to_user")
                    if not message_to_user:
                        continue

                    # 2) Send message back to the user.
                    await client.post(
                        f"{telegram_api}/bot{bot_token}/sendMessage",
                        json={"chat_id": chat_id, "text": message_to_user},
                    )

            except Exception:
                # Keep bot alive. In production you'd log traceback properly.
                await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())

