from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.client import Client
from app.models.visit import Visit
from app.models.vision_test import VisionTest
from app.schemas.visit_and_vision import VisitAndVisionCreateIn, VisitAndVisionCreateOut

router = APIRouter(prefix="/clients", tags=["visit-and-vision"])


@router.post("/{client_id}/visit-and-vision", response_model=VisitAndVisionCreateOut, status_code=status.HTTP_201_CREATED)
async def create_visit_and_vision_test(
    client_id: int,
    payload: VisitAndVisionCreateIn,
    db: AsyncSession = Depends(get_db),
) -> VisitAndVisionCreateOut:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    visit_payload = payload.visit
    vision_payload = payload.vision_test

    visit = Visit(
        client_id=client_id,
        visited_at=visit_payload.visited_at or datetime.utcnow(),
        comment=visit_payload.comment,
    )

    vt = VisionTest(
        client_id=client_id,
        tested_at=vision_payload.tested_at or datetime.utcnow(),
        od_sph=vision_payload.od_sph,
        od_cyl=vision_payload.od_cyl,
        od_axis=vision_payload.od_axis,
        os_sph=vision_payload.os_sph,
        os_cyl=vision_payload.os_cyl,
        os_axis=vision_payload.os_axis,
        pd=vision_payload.pd,
        va_r=vision_payload.va_r,
        va_l=vision_payload.va_l,
        lens_type=vision_payload.lens_type,
        frame_model=vision_payload.frame_model,
        comment=vision_payload.comment,
    )

    db.add(visit)
    db.add(vt)
    await db.commit()
    await db.refresh(visit)
    await db.refresh(vt)

    return VisitAndVisionCreateOut(visit=visit, vision_test=vt)

