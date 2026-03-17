from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.appointment import Appointment
from app.models.client import Client
from app.schemas.appointment import AppointmentCreate, AppointmentPatch, AppointmentRead


router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def create_appointment(payload: AppointmentCreate, db: AsyncSession = Depends(get_db)) -> Appointment:
    # Minimal MVP validation: no past appointments.
    if payload.starts_at.tzinfo is None:
        starts_at = payload.starts_at.replace(tzinfo=timezone.utc)
    else:
        starts_at = payload.starts_at

    if starts_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="starts_at must not be in the past")

    client = await db.get(Client, payload.client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="client_id is invalid")

    appt = Appointment(
        client_id=payload.client_id,
        service=payload.service,
        starts_at=starts_at,
        status=(payload.status or "new"),
        comment=payload.comment,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt


@router.get("", response_model=list[AppointmentRead])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    client_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[Appointment]:
    stmt = select(Appointment).order_by(Appointment.starts_at.asc())
    if client_id is not None:
        stmt = stmt.where(Appointment.client_id == client_id)
    if status_filter is not None:
        stmt = stmt.where(Appointment.status == status_filter)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def patch_appointment(
    appointment_id: int,
    payload: AppointmentPatch,
    db: AsyncSession = Depends(get_db),
) -> Appointment:
    appt = await db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if payload.starts_at is not None:
        appt.starts_at = payload.starts_at
    if payload.status is not None:
        appt.status = payload.status
    if payload.comment is not None:
        appt.comment = payload.comment
    if payload.service is not None:
        appt.service = payload.service

    await db.commit()
    await db.refresh(appt)
    return appt

