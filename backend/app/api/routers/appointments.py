from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core.appointment_status import ALLOWED_APPOINTMENT_STATUSES
from app.models.appointment import Appointment
from app.models.client import Client
from app.schemas.appointment import AppointmentCreate, AppointmentDetailRead, AppointmentPatch, AppointmentRead


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

    effective_status = payload.status or "new"
    if effective_status not in ALLOWED_APPOINTMENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid appointment status: {effective_status!r}",
        )

    appt = Appointment(
        client_id=payload.client_id,
        service=payload.service,
        starts_at=starts_at,
        status=effective_status,
        comment=payload.comment,
        source="crm",
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


@router.get("/{appointment_id}", response_model=AppointmentDetailRead)
async def get_appointment_detail(appointment_id: int, db: AsyncSession = Depends(get_db)) -> AppointmentDetailRead:
    stmt = (
        select(Appointment)
        .where(Appointment.id == appointment_id)
        .options(selectinload(Appointment.client))
    )
    result = await db.execute(stmt)
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    if appt.client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return AppointmentDetailRead.model_validate(appt)


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def patch_appointment(
    appointment_id: int,
    payload: AppointmentPatch,
    db: AsyncSession = Depends(get_db),
) -> Appointment:
    appt = await db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    data = payload.model_dump(exclude_unset=True)
    if "starts_at" in data:
        appt.starts_at = data["starts_at"]
    if "status" in data:
        st = data["status"]
        if st not in ALLOWED_APPOINTMENT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid appointment status: {st!r}",
            )
        appt.status = st
    if "comment" in data:
        appt.comment = data["comment"]
    if "service" in data:
        appt.service = data["service"]

    await db.commit()
    await db.refresh(appt)
    return appt

