import os
import sys
import uuid
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Make sure `backend/` is importable as a top-level package root.
# pytest sometimes runs with a different working directory / pythonpath.
ROOT = Path(__file__).resolve().parents[1]  # backend/
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# POST /public/booking планирует фоновые уведомления; SessionLocal там — глобальный engine,
# не совпадает с sqlite из фикстуры. Отключаем уведомления в тестах.
@pytest.fixture(autouse=True)
def _disable_landing_owner_notifications(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _noop(_appointment_id: int) -> None:
        return None

    monkeypatch.setattr(
        "app.api.routers.public_booking.notify_new_landing_appointment",
        _noop,
        raising=True,
    )
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.api import deps as api_deps
from app.core.config import get_settings
from app.core.jwt_tokens import create_access_token
from app.main import create_app
from app.models.appointment import Appointment
from app.models.appointment_audit import AppointmentAudit  # noqa: F401
from app.models.client_audit import ClientAudit  # noqa: F401
from app.models.base import Base
from app.models.client import Client
from app.models.landing_locale_content import LandingLocaleContent  # noqa: F401
from app.models.user import User
from app.models.vision_test import VisionTest
from app.models.visit import Visit

# Ensure deterministic JWT settings for tests.
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_EXPIRE_MINUTES", "60")

# Если `get_settings` обёрнут в lru_cache — сбросить, чтобы подхватить env тестов.
_gs = get_settings
if hasattr(_gs, "cache_clear"):
    _gs.cache_clear()


@pytest_asyncio.fixture(scope="function")
async def db_engine(tmp_path: Path) -> AsyncGenerator[AsyncEngine, None]:
    """
    Per-test SQLite DB so tests are isolated and do not require Postgres.
    """
    try:
        import aiosqlite  # noqa: F401
    except ImportError as e:
        raise RuntimeError(
            "Missing dependency `aiosqlite` required for sqlite+aiosqlite test DB. "
            "Run: pip install aiosqlite"
        ) from e

    db_path = tmp_path / f"test_{uuid.uuid4().hex}.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", pool_pre_ping=True)

    async with engine.begin() as conn:
        # Importing models above registers them in Base.metadata.
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(scope="function")
def sessionmaker(db_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=db_engine, expire_on_commit=False, autoflush=False, autocommit=False)


@pytest_asyncio.fixture(scope="function")
async def auth_user(sessionmaker: async_sessionmaker[AsyncSession]) -> Generator[User, None, None]:
    async with sessionmaker() as session:
        user = User(
            username=f"test_{uuid.uuid4().hex}",
            role="admin",
            full_name="Test Admin",
            email="admin@example.com",
            telegram_id=None,
            hashed_password=None,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield user


@pytest.fixture(scope="function")
def auth_headers(auth_user: User) -> dict[str, str]:
    token = create_access_token(user_id=auth_user.id, role=auth_user.role, username=auth_user.username)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def fastapi_app(sessionmaker: async_sessionmaker[AsyncSession]):
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with sessionmaker() as session:
            yield session

    # Override app DB dependency (used by protected routers + public booking).
    app.dependency_overrides[api_deps.get_db] = override_get_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def api_client(fastapi_app):
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def future_datetime(days: int = 1) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(microsecond=0).isoformat()

