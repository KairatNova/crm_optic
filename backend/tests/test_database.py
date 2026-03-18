import uuid

import pytest

from app.models.user import User


@pytest.mark.asyncio
async def test_database_can_insert_and_query(sessionmaker):
    username = f"db_{uuid.uuid4().hex}"
    async with sessionmaker() as session:
        user = User(
            username=username,
            role="admin",
            full_name="DB Test",
            email="db@example.com",
            telegram_id=None,
            hashed_password=None,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        got = await session.get(User, user.id)
        assert got is not None
        assert got.username == username

