from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.time import utc_now
from app.models.base import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    service = Column(String(255), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(32), nullable=False, server_default="new")
    comment = Column(String(1000), nullable=True)
    cancellation_reason = Column(String(255), nullable=True)
    # landing — с сайта (публичная запись); crm — создано в CRM; NULL — старые данные
    source = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    client = relationship("Client", backref="appointments")

