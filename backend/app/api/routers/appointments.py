from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.core.appointment_status import ALLOWED_APPOINTMENT_STATUSES
from app.models.appointment import Appointment
from app.models.appointment_audit import AppointmentAudit
from app.models.client import Client
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentDetailRead, AppointmentPatch, AppointmentRead

router = APIRouter(prefix="/appointments", tags=["appointments"])

_AUDIT_FIELDS = ("starts_at", "status", "comment", "service", "cancellation_reason")


def _audit_value(value: datetime | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


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
    if client is None or client.deleted_at is not None:
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
    stmt = select(Appointment).where(Appointment.deleted_at.is_(None)).order_by(Appointment.starts_at.asc())
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
        .where(Appointment.deleted_at.is_(None))
        .options(selectinload(Appointment.client))
    )
    result = await db.execute(stmt)
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    if appt.client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if appt.client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return AppointmentDetailRead.model_validate(appt)


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def patch_appointment(
    appointment_id: int,
    payload: AppointmentPatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Appointment:
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    old = {field: getattr(appt, field) for field in _AUDIT_FIELDS}

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
        if st != "cancelled":
            appt.cancellation_reason = None
    if "comment" in data:
        appt.comment = data["comment"]
    if "service" in data:
        appt.service = data["service"]
    if "cancellation_reason" in data and appt.status == "cancelled":
        appt.cancellation_reason = data["cancellation_reason"]

    for field in _AUDIT_FIELDS:
        prev = old[field]
        new = getattr(appt, field)
        if prev != new:
            db.add(
                AppointmentAudit(
                    appointment_id=appt.id,
                    user_id=user.id,
                    field_name=field,
                    old_value=_audit_value(prev),
                    new_value=_audit_value(new),
                )
            )

    await db.commit()
    await db.refresh(appt)
    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)) -> None:
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    appt.deleted_at = datetime.now(timezone.utc)
    await db.commit()
