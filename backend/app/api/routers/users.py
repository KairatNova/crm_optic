from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_crm_roles
from app.models.user import User
from app.schemas.auth import CRMUserCreate, TelegramAuthUser

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=TelegramAuthUser, status_code=status.HTTP_201_CREATED)
async def create_crm_user(
    payload: CRMUserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_crm_roles("owner")),
) -> User:
    """Только owner: добавить админа по telegram_id (вход через Telegram Login Widget)."""
    existing = await db.execute(select(User).where(User.telegram_id == payload.telegram_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="telegram_id already registered")

    username = f"tg_{payload.telegram_id}"
    clash = await db.execute(select(User).where(User.username == username))
    if clash.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username conflict")

    user = User(
        username=username,
        telegram_id=payload.telegram_id,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=None,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=TelegramAuthUser)
async def me(current: User = Depends(require_crm_roles("owner", "admin", "doctor"))) -> User:
    return current
