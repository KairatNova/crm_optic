from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.client import Client
from app.models.vision_test import VisionTest
from app.schemas.vision_test import VisionTestCreate, VisionTestPatch, VisionTestRead


router = APIRouter(prefix="/clients/{client_id}/vision-tests", tags=["vision-tests"])


@router.get("", response_model=list[VisionTestRead])
async def list_vision_tests(client_id: int, db: AsyncSession = Depends(get_db)) -> list[VisionTest]:
    client = await db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
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
    if client is None or client.deleted_at is not None:
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


@router.patch("/{vision_test_id}", response_model=VisionTestRead)
async def patch_vision_test(
    client_id: int,
    vision_test_id: int,
    payload: VisionTestPatch,
    db: AsyncSession = Depends(get_db),
) -> VisionTest:
    vt = await db.get(VisionTest, vision_test_id)
    if vt is None or vt.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vision test not found")

    if payload.tested_at is not None:
        vt.tested_at = payload.tested_at

    # Для полей-строк просто считаем пустые значения как `None`.
    for field in [
        "od_sph",
        "od_cyl",
        "od_axis",
        "os_sph",
        "os_cyl",
        "os_axis",
        "pd",
        "va_r",
        "va_l",
        "lens_type",
        "frame_model",
        "comment",
    ]:
        if getattr(payload, field) is not None:
            value = getattr(payload, field)
            setattr(vt, field, value.strip() if value.strip() else None)

    await db.commit()
    await db.refresh(vt)
    return vt


@router.delete("/{vision_test_id}", response_model=VisionTestRead)
async def delete_vision_test(
    client_id: int,
    vision_test_id: int,
    db: AsyncSession = Depends(get_db),
) -> VisionTest:
    vt = await db.get(VisionTest, vision_test_id)
    if vt is None or vt.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vision test not found")

    await db.delete(vt)
    await db.commit()
    return vt

