from datetime import date

from pydantic import BaseModel, ConfigDict

from app.schemas.visit import VisitRead
from app.schemas.vision_test import VisionTestRead


class ClientBase(BaseModel):
    name: str
    phone: str
    # Use plain `str` to avoid requiring `email-validator` at runtime.
    email: str | None = None
    gender: str | None = None
    birth_date: date | None = None


class ClientCreate(ClientBase):
    pass


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ClientPatch(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    birth_date: date | None = None


class ClientCardRead(BaseModel):
    client: ClientRead
    visits: list[VisitRead]
    vision_tests: list[VisionTestRead]

