from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.core.jwt_tokens import create_access_token
from app.core.security import (
    consteq,
    expires_in,
    generate_6_digit_code,
    generate_start_token,
    hash_code,
    login_is_phone,
    normalize_phone_kg,
    normalize_username,
    utcnow,
    verify_password,
)
from app.models.login_verification_code import LoginVerificationCode
from app.models.telegram_pending_link import TelegramPendingLink
from app.models.user import User
from app.schemas.auth import (
    AuthUserRead,
    LoginRequestIn,
    LoginRequestOut,
    LoginVerifyIn,
    TelegramStartIn,
    TelegramStartOut,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthUserRead)
async def me(current: User = Depends(get_current_user)) -> AuthUserRead:
    return AuthUserRead(
        id=current.id,
        username=current.username,
        phone=current.phone,
        full_name=current.full_name,
        email=current.email,
        telegram_username=current.telegram_username,
        telegram_chat_id=current.telegram_chat_id,
        role=current.role,
        is_active=bool(current.is_active),
        is_verified=bool(current.is_verified),
        created_at=current.created_at,
    )


def _find_user_stmt(login: str):
    if login_is_phone(login):
        phone = normalize_phone_kg(login)
        if not phone:
            return None
        return select(User).where(User.phone == phone)
    username = normalize_username(login)
    if not username:
        return None
    return select(User).where(User.username == username)


@router.post("/login-request", response_model=LoginRequestOut)
async def login_request(payload: LoginRequestIn, db: AsyncSession = Depends(get_db)) -> LoginRequestOut:
    settings = get_settings()
    stmt = _find_user_stmt(payload.login)
    generic_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if stmt is None:
        raise generic_error

    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if (
        user is None
        or not user.is_active
        or user.role not in {"owner", "admin"}
        or not verify_password(payload.password, user.hashed_password)
    ):
        raise generic_error

    start_token = generate_start_token()
    pending = TelegramPendingLink(
        user_id=user.id,
        start_token=start_token,
        expires_at=expires_in(settings.start_token_ttl_minutes),
    )
    db.add(pending)
    await db.commit()

    if not settings.telegram_bot_username:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="TELEGRAM_BOT_USERNAME missing")

    return LoginRequestOut(
        telegram_link=f"https://t.me/{settings.telegram_bot_username}?start={start_token}",
        message="Open Telegram bot and press Start to receive verification code.",
    )


@router.post("/telegram/start", response_model=TelegramStartOut)
async def telegram_start(
    payload: TelegramStartIn,
    db: AsyncSession = Depends(get_db),
    x_bot_secret: str | None = Header(default=None, alias="X-Bot-Secret"),
) -> TelegramStartOut:
    settings = get_settings()
    if settings.telegram_bot_webhook_secret and x_bot_secret != settings.telegram_bot_webhook_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bot secret")

    result = await db.execute(select(TelegramPendingLink).where(TelegramPendingLink.start_token == payload.start_token))
    pending = result.scalar_one_or_none()
    if pending is None or pending.used_at is not None or pending.expires_at < utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired start token")

    user = await db.get(User, pending.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Link Telegram chat to the user.
    user.telegram_chat_id = payload.chat_id
    user.telegram_username = normalize_username(payload.telegram_username)
    pending.used_at = utcnow()

    code = generate_6_digit_code()
    code_row = LoginVerificationCode(
        user_id=user.id,
        code_hash=hash_code(code, settings.jwt_secret),
        expires_at=expires_in(settings.verification_code_ttl_minutes),
        attempts=0,
    )
    db.add(code_row)
    await db.commit()
    return TelegramStartOut(message_to_user=f"Your login code: {code}. Valid for {settings.verification_code_ttl_minutes} minutes.")


@router.post("/login-verify", response_model=TokenResponse)
async def login_verify(payload: LoginVerifyIn, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    settings = get_settings()
    stmt = _find_user_stmt(payload.login)
    generic_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login or verification code")
    if stmt is None:
        raise generic_error

    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or user.role not in {"owner", "admin"}:
        raise generic_error

    # Берём только самую свежую неиспользованную запись кода.
    # Иначе при повторном запросе кода (до ввода verification_code) могут появиться несколько строк,
    # и `scalar_one_or_none()` упадёт с MultipleResultsFound.
    result_code = await db.execute(
        select(LoginVerificationCode)
        .where(LoginVerificationCode.user_id == user.id, LoginVerificationCode.consumed_at.is_(None))
        .order_by(LoginVerificationCode.id.desc())
        .limit(1)
    )
    code_row = result_code.scalar_one_or_none()
    if code_row is None or code_row.expires_at < utcnow():
        raise generic_error

    if code_row.attempts >= settings.verification_max_attempts:
        code_row.consumed_at = utcnow()
        await db.commit()
        raise generic_error

    expected = hash_code(payload.verification_code.strip(), settings.jwt_secret)
    if not consteq(expected, code_row.code_hash):
        code_row.attempts = int(code_row.attempts) + 1
        if code_row.attempts >= settings.verification_max_attempts:
            code_row.consumed_at = utcnow()
        await db.commit()
        raise generic_error

    code_row.consumed_at = utcnow()
    user.is_verified = True
    await db.commit()

    token = create_access_token(user_id=user.id, role=user.role, username=user.username or f"user_{user.id}")
    return TokenResponse(
        access_token=token,
        user=AuthUserRead(
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
        ),
    )

