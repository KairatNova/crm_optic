from datetime import date, datetime

from pydantic import BaseModel


class PublicBookingCreate(BaseModel):
    name: str
    phone: str
    # Use plain `str` to avoid requiring `email-validator` at runtime.
    email: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    service: str | None = None
    starts_at: datetime
    comment: str | None = None
