from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VisitCreate(BaseModel):
    visited_at: datetime | None = None
    comment: str | None = None


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    visited_at: datetime
    comment: str | None = None


class VisitPatch(BaseModel):
    visited_at: datetime | None = None
    comment: str | None = None

