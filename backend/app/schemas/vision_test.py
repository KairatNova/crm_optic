from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VisionTestCreate(BaseModel):
    tested_at: datetime | None = None
    od_sph: str | None = None
    od_cyl: str | None = None
    od_axis: str | None = None
    os_sph: str | None = None
    os_cyl: str | None = None
    os_axis: str | None = None
    pd: str | None = None
    va_r: str | None = None
    va_l: str | None = None
    lens_type: str | None = None
    frame_model: str | None = None
    comment: str | None = None


class VisionTestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    tested_at: datetime
    od_sph: str | None = None
    od_cyl: str | None = None
    od_axis: str | None = None
    os_sph: str | None = None
    os_cyl: str | None = None
    os_axis: str | None = None
    pd: str | None = None
    va_r: str | None = None
    va_l: str | None = None
    lens_type: str | None = None
    frame_model: str | None = None
    comment: str | None = None

