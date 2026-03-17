from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppointmentBase(BaseModel):
    client_id: int
    service: str | None = None
    starts_at: datetime
    status: str | None = None
    comment: str | None = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentPatch(BaseModel):
    starts_at: datetime | None = None
    status: str | None = None
    comment: str | None = None
    service: str | None = None


class AppointmentRead(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

