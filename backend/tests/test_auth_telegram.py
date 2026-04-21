from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.security import utcnow
from app.models.login_verification_code import LoginVerificationCode
from app.models.telegram_pending_link import TelegramPendingLink
from app.models.user import User


def _sqlite_utcnow_naive():
    # SQLite test DB stores naive datetimes for DateTime(timezone=True) columns.
    return utcnow().replace(tzinfo=None)


async def _create_pending_user(
    sessionmaker: async_sessionmaker[AsyncSession],
    *,
    telegram_id: int | None,
    start_token: str,
) -> User:
    async with sessionmaker() as session:
        user = User(
            username=f"admin_{start_token}",
            phone=None,
            role="admin",
            is_active=True,
            hashed_password="unused-hash",
            telegram_id=telegram_id,
            is_verified=False,
        )
        session.add(user)
        await session.flush()
        session.add(
            TelegramPendingLink(
                user_id=user.id,
                start_token=start_token,
                expires_at=_sqlite_utcnow_naive() + timedelta(minutes=5),
            )
        )
        await session.commit()
        await session.refresh(user)
        return user


@pytest.mark.asyncio
async def test_telegram_start_binds_first_telegram_id_and_creates_code(api_client, sessionmaker):
    token = "test-start-token-bind"
    user = await _create_pending_user(sessionmaker, telegram_id=None, start_token=token)

    res = await api_client.post(
        "/auth/telegram/start",
        json={
            "start_token": token,
            "chat_id": 9001,
            "telegram_id": 777001,
            "telegram_username": "OwnerUser",
        },
    )
    assert res.status_code == 200
    assert "Your login code:" in res.json()["message_to_user"]

    async with sessionmaker() as session:
        db_user = await session.get(User, user.id)
        assert db_user is not None
        assert db_user.telegram_id == 777001
        assert db_user.telegram_chat_id == 9001

        codes = await session.execute(select(LoginVerificationCode).where(LoginVerificationCode.user_id == user.id))
        assert len(codes.scalars().all()) == 1


@pytest.mark.asyncio
async def test_telegram_start_rejects_mismatched_telegram_id(api_client, sessionmaker):
    token = "test-start-token-mismatch"
    user = await _create_pending_user(sessionmaker, telegram_id=111222333, start_token=token)

    res = await api_client.post(
        "/auth/telegram/start",
        json={
            "start_token": token,
            "chat_id": 1234,
            "telegram_id": 444555666,
            "telegram_username": "wrong_account",
        },
    )
    assert res.status_code == 403
    assert "not linked" in (res.json().get("detail") or "").lower()

    async with sessionmaker() as session:
        db_user = await session.get(User, user.id)
        assert db_user is not None
        assert db_user.telegram_id == 111222333
        assert db_user.telegram_chat_id is None

        pending = await session.execute(select(TelegramPendingLink).where(TelegramPendingLink.start_token == token))
        pending_row = pending.scalar_one_or_none()
        assert pending_row is not None
        assert pending_row.used_at is None

        codes = await session.execute(select(LoginVerificationCode).where(LoginVerificationCode.user_id == user.id))
        assert len(codes.scalars().all()) == 0
