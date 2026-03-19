# Backend (MVP)

## База данных

Применить миграции (из папки `backend/`):

```bash
.venv\Scripts\alembic upgrade head
```

Postgres можно поднять через Docker или локально — задайте `DATABASE_URL` в `.env` (см. `.env.example` в корне репозитория).

## Запуск API

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -U pip
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверка:
- `GET /health`
- Лендинг (без входа): `POST /public/booking`
- Вход в CRM: `POST /auth/login-request` -> Telegram `/start` -> `POST /auth/login-verify`

## CRM и Telegram (owner/admin flow)

1. В `.env`: `TELEGRAM_BOT_USERNAME`, `JWT_SECRET`, TTL/attempts настройки (см. `.env.example`).
2. Owner создаёт админов: `POST /owner/admins`.
3. Админ входит: `POST /auth/login-request` -> открыть `telegram_link` -> бот вызывает `POST /auth/telegram/start` -> `POST /auth/login-verify`.

Подробно: **`docs/CRM_TELEGRAM_AUTH.md`**.
