from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.models.base import Base


class TelegramPendingLink(Base):
    __tablename__ = "telegram_pending_links"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_token = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    used_at = Column(DateTime(timezone=True), nullable=True, index=True)

