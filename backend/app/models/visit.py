from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.time import utc_now
from app.models.base import Base


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    visited_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    comment = Column(String(1000), nullable=True)

    client = relationship("Client", backref="visits")

