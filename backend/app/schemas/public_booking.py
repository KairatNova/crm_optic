from datetime import date, datetime

from pydantic import BaseModel, EmailStr


class PublicBookingCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr | None = None
    gender: str | None = None
    birth_date: date | None = None
    service: str | None = None
    starts_at: datetime
    comment: str | None = None
