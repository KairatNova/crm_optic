from datetime import date

from pydantic import BaseModel, ConfigDict


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

