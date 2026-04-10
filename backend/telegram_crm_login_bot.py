import asyncio
import logging
import os
from typing import Any

import httpx

from app.core.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("telegram_crm_login_bot")


def _telegram_api_base() -> str:
    return "https://api.telegram.org"


def _httpx_network_hint(exc: BaseException) -> str:
    """Windows 11001 / getaddrinfo failed — чаще всего DNS или нет сети, не «неверный токен»."""
    text = f"{exc!s} {exc.__cause__!s}".lower()
    if "getaddrinfo" in text or "11001" in text:
        return (
            "Не удаётся разрешить имя хоста (DNS) или нет сети. Проверьте интернет, "
            "команду `ping api.telegram.org`, VPN/файрвол; при необходимости уберите HTTP_PROXY/HTTPS_PROXY из окружения."
        )
    if isinstance(exc, httpx.ConnectError) and exc.__cause__ is not None:
        return f"Сеть: {exc.__cause__!s}. Проверьте доступ к https://api.telegram.org"
    return "Проверьте интернет и настройки сети."


def _read_backend_api_base() -> str:
    # Явный URL API (удобно для Docker / удалённого сервера). Иначе — localhost + BACKEND_PORT.
    explicit = os.getenv("BACKEND_API_BASE_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    port = os.getenv("BACKEND_PORT", "8000")
    return f"http://127.0.0.1:{port}"


def _start_token_from_text(text: str) -> str | None:
    # Deep link: "/start <token>"; в группах иногда "/start@BotName <token>"
    parts = text.strip().split()
    if len(parts) < 2:
        return None
    first = parts[0]
    if not (first == "/start" or first.startswith("/start@")):
        return None
    return parts[1]


async def _delete_webhook_if_set(client: httpx.AsyncClient, telegram_api: str, bot_token: str) -> None:
    """С активным webhook getUpdates не получает сообщения — типичная причина «Старт нажал, кода нет»."""
    info = await client.get(f"{telegram_api}/bot{bot_token}/getWebhookInfo")
    info.raise_for_status()
    data = info.json()
    if not data.get("ok"):
        return
    url = (data.get("result") or {}).get("url") or ""
    if url:
        logger.warning("Webhook уже установлен (%s) — отключаю для long polling", url)
        del_r = await client.post(f"{telegram_api}/bot{bot_token}/deleteWebhook", json={"drop_pending_updates": False})
        del_r.raise_for_status()


async def _send_user_text(
    client: httpx.AsyncClient, telegram_api: str, bot_token: str, chat_id: int, text: str
) -> None:
    await client.post(
        f"{telegram_api}/bot{bot_token}/sendMessage",
        json={"chat_id": chat_id, "text": text},
    )


async def main() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is missing")

    api_base = _read_backend_api_base()
    logger.info("Polling Telegram updates; backend API: %s", api_base)
    bot_token = settings.telegram_bot_token

    telegram_api = _telegram_api_base()
    offset = 0
    headers_for_backend = {}
    if settings.telegram_bot_webhook_secret:
        headers_for_backend["X-Bot-Secret"] = settings.telegram_bot_webhook_secret

    # trust_env=False — чтобы сломанные HTTP(S)_PROXY в окружении не ломали резолвинг api.telegram.org
    async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
        try:
            await _delete_webhook_if_set(client, telegram_api, bot_token)
        except httpx.ConnectError as e:
            logger.error(
                "Не достучаться до Telegram API (%s). %s",
                telegram_api,
                _httpx_network_hint(e),
            )
        except httpx.HTTPStatusError as e:
            logger.exception(
                "getWebhookInfo HTTP %s — часто неверный TELEGRAM_BOT_TOKEN или лимит Telegram",
                e.response.status_code,
            )
        except Exception:
            logger.exception("getWebhookInfo/deleteWebhook failed")

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
                    if not text.strip().startswith("/start"):
                        continue

                    chat = message.get("chat") or {}
                    chat_id = chat.get("id")
                    from_user = message.get("from") or {}
                    telegram_username = from_user.get("username")

                    if not isinstance(chat_id, int):
                        continue

                    start_token = _start_token_from_text(text)
                    if not start_token:
                        await _send_user_text(
                            client,
                            telegram_api,
                            bot_token,
                            chat_id,
                            "Войдите через CRM: введите логин и пароль и откройте выданную ссылку "
                            "(кнопка «Старт» должна открыться именно из этой ссылки).",
                        )
                        continue

                    # 1) Call backend to bind chat and get login code message.
                    try:
                        start_resp = await client.post(
                            f"{api_base}/auth/telegram/start",
                            json={
                                "start_token": start_token,
                                "chat_id": chat_id,
                                "telegram_username": telegram_username,
                            },
                            headers=headers_for_backend,
                        )
                    except httpx.RequestError as e:
                        logger.warning("auth/telegram/start unreachable (%s): %s", api_base, e)
                        await _send_user_text(
                            client,
                            telegram_api,
                            bot_token,
                            chat_id,
                            "Не удалось связаться с сервером входа. Проверьте, что API запущен и "
                            "для бота задан верный BACKEND_API_BASE_URL (если бот не на той же машине).",
                        )
                        continue

                    if start_resp.status_code >= 400:
                        body = (await start_resp.aread()).decode(errors="replace")[:500]
                        logger.warning(
                            "auth/telegram/start failed: %s %s",
                            start_resp.status_code,
                            body,
                        )
                        if start_resp.status_code == 403:
                            user_msg = "Ошибка доступа к серверу (секрет бота). Проверьте TELEGRAM_BOT_WEBHOOK_SECRET в .env и заголовок у бота."
                        elif start_resp.status_code == 400:
                            user_msg = (
                                "Ссылка входа устарела или уже использована. Вернитесь в CRM и запросите вход заново."
                            )
                        else:
                            user_msg = "Ошибка сервера при входе. Попробуйте снова через минуту или обратитесь к администратору."
                        await _send_user_text(client, telegram_api, bot_token, chat_id, user_msg)
                        continue

                    try:
                        start_out = start_resp.json()
                    except Exception:
                        logger.exception("auth/telegram/start: не JSON в ответе")
                        await _send_user_text(
                            client,
                            telegram_api,
                            bot_token,
                            chat_id,
                            "Некорректный ответ сервера. Проверьте URL API (BACKEND_API_BASE_URL).",
                        )
                        continue

                    message_to_user = start_out.get("message_to_user")
                    if not message_to_user:
                        continue

                    await _send_user_text(client, telegram_api, bot_token, chat_id, message_to_user)

            except httpx.ConnectError as e:
                logger.error(
                    "getUpdates: нет связи с Telegram. %s Повтор через 10 с.",
                    _httpx_network_hint(e),
                )
                await asyncio.sleep(10)
            except Exception:
                logger.exception("poll loop error")
                await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())

