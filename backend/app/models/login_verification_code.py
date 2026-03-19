from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.models.base import Base


class LoginVerificationCode(Base):
    __tablename__ = "login_verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    attempts = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    consumed_at = Column(DateTime(timezone=True), nullable=True, index=True)

