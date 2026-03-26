import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.landing_locale_content import LandingLocaleContent
from app.schemas.landing_content import LandingContentRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/landing-content", response_model=LandingContentRead)
async def get_public_landing_content(
    locale: str = Query(default="ru", min_length=2, max_length=5),
    db: AsyncSession = Depends(get_db),
) -> LandingContentRead:
    try:
        row = await db.get(LandingLocaleContent, locale)
        if row is None:
            return LandingContentRead(locale=locale, payload={})
        return LandingContentRead(locale=row.locale, payload=dict(row.payload or {}))
    except SQLAlchemyError as e:
        logger.warning("public landing-content fallback (db unavailable or schema missing): %s", e)
        return LandingContentRead(locale=locale, payload={})
