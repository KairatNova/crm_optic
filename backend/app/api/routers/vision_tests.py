from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.client import Client
from app.models.vision_test import VisionTest
from app.schemas.vision_test import VisionTestCreate, VisionTestRead


router = APIRouter(prefix="/clients/{client_id}/vision-tests", tags=["vision-tests"])


@router.get("", response_model=list[VisionTestRead])
async def list_vision_tests(client_id: int, db: AsyncSession = Depends(get_db)) -> list[VisionTest]:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    result = await db.execute(
        select(VisionTest).where(VisionTest.client_id == client_id).order_by(VisionTest.tested_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=VisionTestRead, status_code=status.HTTP_201_CREATED)
async def create_vision_test(
    client_id: int, payload: VisionTestCreate, db: AsyncSession = Depends(get_db)
) -> VisionTest:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    vt = VisionTest(
        client_id=client_id,
        tested_at=payload.tested_at or datetime.utcnow(),
        od_sph=payload.od_sph,
        od_cyl=payload.od_cyl,
        od_axis=payload.od_axis,
        os_sph=payload.os_sph,
        os_cyl=payload.os_cyl,
        os_axis=payload.os_axis,
        pd=payload.pd,
        va_r=payload.va_r,
        va_l=payload.va_l,
        lens_type=payload.lens_type,
        frame_model=payload.frame_model,
        comment=payload.comment,
    )
    db.add(vt)
    await db.commit()
    await db.refresh(vt)
    return vt

