from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Keep real env files first and avoid loading *.example defaults
        # that can unintentionally overwrite secrets with empty values.
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = Field(alias="DATABASE_URL")

    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    jwt_secret: str = Field(default="change-me-in-production", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=43200, alias="JWT_EXPIRE_MINUTES")
    verification_code_ttl_minutes: int = Field(default=10, alias="VERIFICATION_CODE_TTL_MINUTES")
    start_token_ttl_minutes: int = Field(default=10, alias="START_TOKEN_TTL_MINUTES")
    verification_max_attempts: int = Field(default=5, alias="VERIFICATION_MAX_ATTEMPTS")
    telegram_bot_username: str = Field(default="", alias="TELEGRAM_BOT_USERNAME")
    telegram_bot_webhook_secret: str = Field(default="", alias="TELEGRAM_BOT_WEBHOOK_SECRET")
    telegram_bot_autostart: bool = Field(default=True, alias="TELEGRAM_BOT_AUTOSTART")
    telegram_bootstrap_owner_telegram_id: int | None = Field(
        default=None,
        alias="TELEGRAM_BOOTSTRAP_OWNER_TELEGRAM_ID",
    )
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    owner_notify_enabled: bool = Field(default=True, alias="OWNER_NOTIFY_ENABLED")
    owner_notify_email: str = Field(default="", alias="OWNER_NOTIFY_EMAIL")
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="", alias="SMTP_FROM")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")

    @field_validator("telegram_bootstrap_owner_telegram_id", mode="before")
    @classmethod
    def empty_bootstrap_id(cls, v: object) -> object:
        if v is None or v == "":
            return None
        return v


def get_settings() -> Settings:
    return Settings()

