from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, JSON, String

from app.models.base import Base


class LandingLocaleContent(Base):
    """Переопределения текстов лендинга по локали (редактирует owner в CRM)."""

    __tablename__ = "landing_locale_content"

    locale = Column(String(5), primary_key=True)
    payload = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
