from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.jwt_tokens import create_access_token
from app.core.telegram_login import verify_telegram_login
from app.models.user import User
from app.schemas.auth import TelegramAuthUser, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/telegram/callback", response_model=TokenResponse)
async def telegram_login_callback(request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    URL для Telegram Login Widget: data-auth-url = .../auth/telegram/callback
    """
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TELEGRAM_BOT_TOKEN is not configured",
        )

    params = dict(request.query_params)
    if not verify_telegram_login(params, settings.telegram_bot_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram auth")

    try:
        tg_id = int(params["id"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing id")

    result = await db.execute(select(User).where(User.telegram_id == tg_id))
    user = result.scalar_one_or_none()

    if user is None:
        bootstrap_id = settings.telegram_bootstrap_owner_telegram_id
        if bootstrap_id is not None and tg_id == bootstrap_id:
            owner_count = await db.scalar(select(func.count()).select_from(User).where(User.role == "owner"))
            if owner_count and owner_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Owner already exists; add this telegram_id via POST /users",
                )
            first = (params.get("first_name") or "").strip() or None
            user = User(
                username=f"tg_{tg_id}",
                telegram_id=tg_id,
                full_name=first,
                hashed_password=None,
                role="owner",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No CRM access for this Telegram account. Ask the owner to add your telegram_id.",
            )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled")

    token = create_access_token(user_id=user.id, role=user.role, username=user.username)
    return TokenResponse(
        access_token=token,
        user=TelegramAuthUser(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            telegram_id=int(user.telegram_id) if user.telegram_id is not None else None,
        ),
    )
