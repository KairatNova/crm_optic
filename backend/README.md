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
- Вход в CRM (Telegram): `GET /auth/telegram/callback` — см. `docs/CRM_TELEGRAM_AUTH.md`

## CRM и Telegram

1. В `.env`: `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, опционально `TELEGRAM_BOOTSTRAP_OWNER_TELEGRAM_ID` (ваш числовой Telegram ID для первого владельца).
2. Первый вход владельца через виджет → создаётся пользователь с ролью `owner`.
3. Дальше owner добавляет админов: `POST /users` с заголовком `Authorization: Bearer <token>` и телом `{ "telegram_id": ..., "role": "admin" }`.

Подробно: **`docs/CRM_TELEGRAM_AUTH.md`**.
