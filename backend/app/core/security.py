import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def normalize_username(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip().lower()
    if not v:
        return None
    if v.startswith("@"):
        v = v[1:]
    return v or None


def digits_only_phone(value: str | None) -> str:
    if not value:
        return ""
    return "".join(ch for ch in value if ch.isdigit())


def phones_equivalent(a: str | None, b: str | None) -> bool:
    """Сравнение телефонов для поиска дублей: цифры и/или нормализация KG."""
    if not a or not b:
        return False
    da = digits_only_phone(a)
    db = digits_only_phone(b)
    if da and db and da == db:
        return True
    na = normalize_phone_kg(a)
    nb = normalize_phone_kg(b)
    return bool(na and nb and na == nb)


def normalize_phone_kg(value: str | None) -> str | None:
    if value is None:
        return None
    digits = "".join(ch for ch in value if ch.isdigit())
    if digits.startswith("996") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 10:
        return f"+996{digits[1:]}"
    if len(digits) == 9:
        return f"+996{digits}"
    return None


def login_is_phone(login: str) -> bool:
    s = login.strip()
    return s.startswith("+") or s[:1].isdigit()


def generate_6_digit_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_start_token() -> str:
    return secrets.token_urlsafe(24)


def hash_code(code: str, secret: str) -> str:
    return hashlib.sha256(f"{secret}:{code}".encode("utf-8")).hexdigest()


def consteq(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def expires_in(minutes: int) -> datetime:
    return utcnow() + timedelta(minutes=minutes)

