from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_crm_roles
from app.models.landing_locale_content import LandingLocaleContent
from app.models.user import User
from app.schemas.landing_content import LandingContentRead, LandingContentWrite

router = APIRouter(prefix="/owner/landing-content", tags=["owner-landing"])


@router.get("", response_model=LandingContentRead)
async def get_owner_landing_content(
    locale: str = Query(default="ru", min_length=2, max_length=5),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_crm_roles("owner")),
) -> LandingContentRead:
    row = await db.get(LandingLocaleContent, locale)
    if row is None:
        return LandingContentRead(locale=locale, payload={})
    return LandingContentRead(locale=row.locale, payload=dict(row.payload or {}))


@router.put("", response_model=LandingContentRead)
async def put_owner_landing_content(
    body: LandingContentWrite,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_crm_roles("owner")),
) -> LandingContentRead:
    if not isinstance(body.payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="payload must be an object")

    row = await db.get(LandingLocaleContent, body.locale)
    now = datetime.now(timezone.utc)
    if row is None:
        row = LandingLocaleContent(locale=body.locale, payload=body.payload, updated_at=now)
        db.add(row)
    else:
        row.payload = body.payload
        row.updated_at = now
    await db.commit()
    await db.refresh(row)
    return LandingContentRead(locale=row.locale, payload=dict(row.payload or {}))
