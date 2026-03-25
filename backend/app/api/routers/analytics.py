from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.appointment import Appointment
from app.models.client import Client


router = APIRouter(prefix="/analytics", tags=["analytics"])


class PopularServiceRow(BaseModel):
    label: str
    count: int


class AnalyticsSummary(BaseModel):
    total_clients: int
    new_clients: int
    appointments_total: int
    appointments_done: int
    conversion_percent: float
    popular_services: list[PopularServiceRow]


def _service_bucket(service: str | None) -> str:
    s = (service or "").strip().lower()
    if not s:
        return "Другое"
    if "проверка" in s or "vision" in s or "eye" in s:
        return "Проверка зрения"
    if "подбор" in s or "оправ" in s or "очк" in s or "frames" in s:
        return "Подбор очков"
    if "линз" in s or "contact" in s:
        return "Линзы"
    if "сервис" in s or "ремонт" in s or "repair" in s:
        return "Сервис и ремонт"
    return "Другое"


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    db: AsyncSession = Depends(get_db),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
) -> AnalyticsSummary:
    """
    По умолчанию: период 30 дней до сегодняшнего дня включительно (по starts_at).
    Конверсия: done / total * 100.
    """
    today = datetime.now(timezone.utc).date()
    if to_date is None:
        to_date = today
    # Default to last 30 days including to_date
    if from_date is None:
        from_date = to_date - timedelta(days=29)

    starts_from = datetime(from_date.year, from_date.month, from_date.day, tzinfo=timezone.utc)
    starts_to_excl = datetime(to_date.year, to_date.month, to_date.day, tzinfo=timezone.utc) + timedelta(days=1)

    total_clients = await db.scalar(select(func.count()).select_from(Client).where(Client.deleted_at.is_(None)))
    new_clients = await db.scalar(
        select(func.count())
        .select_from(Client)
        .where(
            and_(
                Client.deleted_at.is_(None),
                Client.created_at >= starts_from,
                Client.created_at < starts_to_excl,
            )
        )
    )

    appt_base = and_(
        Appointment.deleted_at.is_(None),
        Appointment.starts_at >= starts_from,
        Appointment.starts_at < starts_to_excl,
    )

    appointments_total = await db.scalar(select(func.count()).select_from(Appointment).where(appt_base))
    appointments_done = await db.scalar(
        select(func.count()).select_from(Appointment).where(and_(appt_base, Appointment.status == "done"))
    )

    appointments_total = int(appointments_total or 0)
    appointments_done = int(appointments_done or 0)
    total_clients = int(total_clients or 0)
    new_clients = int(new_clients or 0)

    conversion_percent = 0.0 if appointments_total == 0 else round((appointments_done / appointments_total) * 100.0, 1)

    res = await db.execute(
        select(Appointment.service, func.count())
        .where(appt_base)
        .group_by(Appointment.service)
        .order_by(func.count().desc())
    )
    buckets: dict[str, int] = {}
    for svc, cnt in res.all():
        b = _service_bucket(svc)
        buckets[b] = buckets.get(b, 0) + int(cnt or 0)

    popular_services = [
        PopularServiceRow(label=label, count=count)
        for label, count in sorted(buckets.items(), key=lambda x: x[1], reverse=True)
        if count > 0
    ][:4]

    return AnalyticsSummary(
        total_clients=total_clients,
        new_clients=new_clients,
        appointments_total=appointments_total,
        appointments_done=appointments_done,
        conversion_percent=conversion_percent,
        popular_services=popular_services,
    )

