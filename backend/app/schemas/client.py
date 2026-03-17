from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr


class ClientBase(BaseModel):
    name: str
    phone: str
    email: EmailStr | None = None
    gender: str | None = None
    birth_date: date | None = None


class ClientCreate(ClientBase):
    pass


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

