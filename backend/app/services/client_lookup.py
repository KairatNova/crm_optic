from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import phones_equivalent
from app.models.client import Client


async def find_active_client_by_phone(db: AsyncSession, phone: str) -> Client | None:
    result = await db.execute(select(Client).where(Client.deleted_at.is_(None)))
    for c in result.scalars().all():
        if phones_equivalent(c.phone, phone):
            return c
    return None
