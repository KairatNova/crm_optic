from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    service = Column(String(255), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(32), nullable=False, server_default="new")
    comment = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    client = relationship("Client", backref="appointments")

