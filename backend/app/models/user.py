from sqlalchemy import Boolean, Column, Integer, String

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, server_default="admin")
    is_active = Column(Boolean, nullable=False, server_default="true")

