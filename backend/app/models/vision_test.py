from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.time import utc_now
from app.models.base import Base


class VisionTest(Base):
    __tablename__ = "vision_tests"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    tested_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    od_sph = Column(String(16), nullable=True)
    od_cyl = Column(String(16), nullable=True)
    od_axis = Column(String(16), nullable=True)
    os_sph = Column(String(16), nullable=True)
    os_cyl = Column(String(16), nullable=True)
    os_axis = Column(String(16), nullable=True)
    pd = Column(String(16), nullable=True)
    va_r = Column(String(16), nullable=True)
    va_l = Column(String(16), nullable=True)
    lens_type = Column(String(64), nullable=True)
    frame_model = Column(String(128), nullable=True)
    comment = Column(String(1000), nullable=True)

    client = relationship("Client", backref="vision_tests")

