from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Integer, String

from app.models.base import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    gender = Column(String(16), nullable=True)
    birth_date = Column(Date, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

