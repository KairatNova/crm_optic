from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.core.time import utc_now
from app.models.base import Base


class TelegramPendingLink(Base):
    __tablename__ = "telegram_pending_links"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_token = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    used_at = Column(DateTime(timezone=True), nullable=True, index=True)

