from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.client import Client
from app.models.client_audit import ClientAudit
from app.models.user import User
from app.models.vision_test import VisionTest
from app.models.visit import Visit
from app.schemas.client import ClientAuditRead, ClientCardRead, ClientCreate, ClientPatch, ClientRead
from app.services.client_lookup import find_active_client_by_phone

router = APIRouter(prefix="/clients", tags=["clients"])

_CLIENT_AUDIT_FIELDS = ("name", "phone", "email", "gender", "birth_date")


def _client_audit_value(value: datetime | date | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Client:
    client = Client(
        name=payload.name,
        phone=payload.phone,
        email=str(payload.email) if payload.email is not None else None,
        gender=payload.gender,
        birth_date=payload.birth_date,
    )
    db.add(client)
    await db.flush()
    db.add(
        ClientAudit(
            client_id=client.id,
            user_id=user.id,
            field_name="created",
            old_value=None,
            new_value=f"name={client.name};phone={client.phone}",
        )
    )
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_client(
    client_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    client = await db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    now = datetime.now(timezone.utc)
    client.deleted_at = now
    db.add(
        ClientAudit(
            client_id=client.id,
            user_id=user.id,
            field_name="deleted_at",
            old_value=None,
            new_value=now.isoformat(),
        )
    )
    await db.commit()


@router.get("", response_model=list[ClientRead])
async def list_clients(db: AsyncSession = Depends(get_db)) -> list[Client]:
    result = await db.execute(select(Client).where(Client.deleted_at.is_(None)).order_by(Client.id.desc()))
    return list(result.scalars().all())


@router.get("/lookup", response_model=ClientRead)
async def lookup_client_by_phone(phone: str = Query(..., min_length=2), db: AsyncSession = Depends(get_db)) -> Client:
    client = await find_active_client_by_phone(db, phone)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.get("/{client_id}/audit", response_model=list[ClientAuditRead])
async def list_client_audit(
    client_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[ClientAudit]:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    result = await db.execute(
        select(ClientAudit).where(ClientAudit.client_id == client_id).order_by(ClientAudit.id.desc())
    )
    return list(result.scalars().all())


@router.get("/{client_id}", response_model=ClientRead)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)) -> Client:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.get("/{client_id}/card", response_model=ClientCardRead)
async def get_client_card(client_id: int, db: AsyncSession = Depends(get_db)) -> ClientCardRead:
    client = await db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    visits_result = await db.execute(
        select(Visit).where(Visit.client_id == client_id).order_by(Visit.visited_at.desc())
    )
    vision_result = await db.execute(
        select(VisionTest).where(VisionTest.client_id == client_id).order_by(VisionTest.tested_at.desc())
    )

    visits = list(visits_result.scalars().all())
    vision_tests = list(vision_result.scalars().all())

    return ClientCardRead(client=client, visits=visits, vision_tests=vision_tests)


@router.patch("/{client_id}", response_model=ClientRead)
async def patch_client(
    client_id: int,
    payload: ClientPatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Client:
    client = await db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    old = {field: getattr(client, field) for field in _CLIENT_AUDIT_FIELDS}

    if payload.name is not None and payload.name.strip():
        client.name = payload.name.strip()
    if payload.phone is not None and payload.phone.strip():
        client.phone = payload.phone.strip()
    if payload.email is not None:
        email = payload.email.strip()
        client.email = email.lower().strip() if email else None
    if payload.gender is not None:
        g = payload.gender.strip()
        client.gender = g if g else None
    if payload.birth_date is not None:
        client.birth_date = payload.birth_date

    for field in _CLIENT_AUDIT_FIELDS:
        prev = old[field]
        new = getattr(client, field)
        if prev != new:
            db.add(
                ClientAudit(
                    client_id=client.id,
                    user_id=user.id,
                    field_name=field,
                    old_value=_client_audit_value(prev),
                    new_value=_client_audit_value(new),
                )
            )

    await db.commit()
    await db.refresh(client)
    return client
