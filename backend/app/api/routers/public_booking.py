"""Публичная запись с лендинга (без авторизации)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.appointment import Appointment
from app.models.client import Client
from app.schemas.appointment import AppointmentRead
from app.schemas.public_booking import PublicBookingCreate
from app.services.client_lookup import find_active_client_by_phone

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/booking", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def public_booking(payload: PublicBookingCreate, db: AsyncSession = Depends(get_db)) -> Appointment:
    if payload.starts_at.tzinfo is None:
        starts_at = payload.starts_at.replace(tzinfo=timezone.utc)
    else:
        starts_at = payload.starts_at
    if starts_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="starts_at must not be in the past")

    existing = await find_active_client_by_phone(db, payload.phone)
    if existing is not None:
        client = existing
    else:
        client = Client(
            name=payload.name,
            phone=payload.phone,
            email=str(payload.email) if payload.email else None,
            gender=payload.gender,
            birth_date=payload.birth_date,
        )
        db.add(client)
        await db.flush()

    appt = Appointment(
        client_id=client.id,
        service=payload.service,
        starts_at=starts_at,
        status="new",
        comment=payload.comment,
        source="landing",
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt
