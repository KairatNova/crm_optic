from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.client import Client
from app.models.visit import Visit
from app.schemas.visit import VisitCreate, VisitPatch, VisitRead


router = APIRouter(prefix="/clients/{client_id}/visits", tags=["visits"])


@router.get("", response_model=list[VisitRead])
async def list_visits(client_id: int, db: AsyncSession = Depends(get_db)) -> list[Visit]:
    client = await db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    result = await db.execute(
        select(Visit).where(Visit.client_id == client_id).order_by(Visit.visited_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
async def create_visit(client_id: int, payload: VisitCreate, db: AsyncSession = Depends(get_db)) -> Visit:
    client = await db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    visit = Visit(
        client_id=client_id,
        visited_at=payload.visited_at or datetime.utcnow(),
        comment=payload.comment,
    )
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit


@router.patch("/{visit_id}", response_model=VisitRead)
async def patch_visit(
    client_id: int,
    visit_id: int,
    payload: VisitPatch,
    db: AsyncSession = Depends(get_db),
) -> Visit:
    visit = await db.get(Visit, visit_id)
    if visit is None or visit.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

    if payload.visited_at is not None:
        visit.visited_at = payload.visited_at
    if payload.comment is not None:
        visit.comment = payload.comment.strip() if payload.comment.strip() else None

    await db.commit()
    await db.refresh(visit)
    return visit


@router.delete("/{visit_id}", response_model=VisitRead)
async def delete_visit(
    client_id: int,
    visit_id: int,
    db: AsyncSession = Depends(get_db),
) -> Visit:
    visit = await db.get(Visit, visit_id)
    if visit is None or visit.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

    await db.delete(visit)
    await db.commit()
    return visit

