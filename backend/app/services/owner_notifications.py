"""Уведомления владельца о новой записи с лендинга (Telegram / email)."""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.appointment import Appointment
from app.models.user import User

logger = logging.getLogger(__name__)


def _format_booking_message(appt: Appointment) -> str:
    client = appt.client
    name = client.name if client else "?"
    phone = client.phone if client else "?"
    starts = appt.starts_at.isoformat() if appt.starts_at else "?"
    svc = appt.service or "—"
    return (
        f"Новая запись с сайта #{appt.id}\n"
        f"Клиент: {name}\n"
        f"Телефон: {phone}\n"
        f"Услуга: {svc}\n"
        f"Время: {starts}\n"
        f"Комментарий: {appt.comment or '—'}"
    )


async def _send_telegram_to_owners(text: str) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token or not settings.owner_notify_enabled:
        return
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(
                User.role == "owner",
                User.is_active.is_(True),
                User.telegram_chat_id.isnot(None),
            )
        )
        owners = list(result.scalars().all())
    if not owners:
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=15.0, trust_env=False) as client:
        for u in owners:
            cid = u.telegram_chat_id
            if cid is None:
                continue
            try:
                r = await client.post(url, json={"chat_id": int(cid), "text": text})
                r.raise_for_status()
                data = r.json()
                if not data.get("ok"):
                    logger.warning("Telegram sendMessage not ok for owner user_id=%s: %s", u.id, data)
            except Exception:
                logger.exception("Telegram notify failed for owner user_id=%s chat_id=%s", u.id, cid)


def _send_smtp_email_sync(subject: str, body: str, to_addrs: list[str], settings) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user or "noreply@localhost"
    msg["To"] = ", ".join(to_addrs)
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


async def _send_email_to_owners(text: str) -> None:
    settings = get_settings()
    if not settings.owner_notify_enabled:
        return
    if not settings.smtp_host or not settings.owner_notify_email.strip():
        return
    to_addrs = [e.strip() for e in settings.owner_notify_email.split(",") if e.strip()]
    if not to_addrs:
        return
    subject = "Новая запись с сайта (CRM Optic)"
    try:
        await asyncio.to_thread(_send_smtp_email_sync, subject, text, to_addrs, settings)
    except Exception:
        logger.exception("SMTP owner notify failed")


async def notify_new_landing_appointment(appointment_id: int) -> None:
    """Загружает запись из БД и шлёт уведомления; ошибки только в лог."""
    try:
        async with SessionLocal() as session:
            appt = await session.get(
                Appointment,
                appointment_id,
                options=[selectinload(Appointment.client)],
            )
            if appt is None:
                logger.warning("notify_new_landing_appointment: appointment %s not found", appointment_id)
                return
            text = _format_booking_message(appt)
    except Exception:
        logger.exception("notify_new_landing_appointment: load failed id=%s", appointment_id)
        return

    await _send_telegram_to_owners(text)
    await _send_email_to_owners(text)
