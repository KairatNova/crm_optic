from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String

from app.core.time import utc_now
from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    phone = Column(String(32), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    telegram_username = Column(String(64), nullable=True)
    telegram_chat_id = Column(BigInteger, unique=True, nullable=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(32), nullable=False, server_default="admin")  # owner|admin
    is_active = Column(Boolean, nullable=False, server_default="true")
    is_verified = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

