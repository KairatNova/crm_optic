from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_crm_roles
from app.core.security import hash_password, normalize_phone_kg, normalize_username
from app.models.user import User
from app.schemas.auth import AuthUserRead, OwnerAdminCreate, OwnerAdminPatch


router = APIRouter(prefix="/owner/admins", tags=["owner-admins"])


def _to_read(user: User) -> AuthUserRead:
    return AuthUserRead(
        id=user.id,
        username=user.username,
        phone=user.phone,
        full_name=user.full_name,
        email=user.email,
        telegram_username=user.telegram_username,
        telegram_chat_id=user.telegram_chat_id,
        role=user.role,
        is_active=bool(user.is_active),
        is_verified=bool(user.is_verified),
        created_at=user.created_at,
    )


@router.post("", response_model=AuthUserRead, status_code=status.HTTP_201_CREATED)
async def create_admin(
    payload: OwnerAdminCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_crm_roles("owner")),
) -> AuthUserRead:
    username = normalize_username(payload.username)
    phone = normalize_phone_kg(payload.phone)
    if not username and not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="username or phone is required")

    if username:
        exists_user = await db.execute(select(User).where(User.username == username))
        if exists_user.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username already exists")
    if phone:
        exists_phone = await db.execute(select(User).where(User.phone == phone))
        if exists_phone.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="phone already exists")

    user = User(
        username=username,
        phone=phone,
        full_name=payload.full_name,
        email=payload.email.lower().strip() if payload.email else None,
        telegram_username=normalize_username(payload.telegram_username),
        hashed_password=hash_password(payload.password),
        role="admin",
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _to_read(user)


@router.get("", response_model=list[AuthUserRead])
async def list_admins(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_crm_roles("owner")),
) -> list[AuthUserRead]:
    result = await db.execute(select(User).where(User.role == "admin").order_by(User.id.desc()))
    rows = list(result.scalars().all())
    return [_to_read(r) for r in rows]


@router.patch("/{user_id}", response_model=AuthUserRead)
async def patch_admin(
    user_id: int,
    payload: OwnerAdminPatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_crm_roles("owner")),
) -> AuthUserRead:
    user = await db.get(User, user_id)
    if user is None or user.role != "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.username is not None:
        username = normalize_username(payload.username)
        if username:
            exists_user = await db.execute(select(User).where(User.username == username, User.id != user_id))
            if exists_user.scalar_one_or_none() is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username already exists")
        user.username = username
    if payload.password:
        user.hashed_password = hash_password(payload.password)
        user.is_verified = False
    if payload.phone is not None:
        phone = normalize_phone_kg(payload.phone)
        if phone:
            exists_phone = await db.execute(select(User).where(User.phone == phone, User.id != user_id))
            if exists_phone.scalar_one_or_none() is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="phone already exists")
        user.phone = phone
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email.lower().strip() if payload.email else None
    if payload.telegram_username is not None:
        user.telegram_username = normalize_username(payload.telegram_username)

    await db.commit()
    await db.refresh(user)
    return _to_read(user)

