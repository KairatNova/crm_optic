# Backend (MVP)

## База данных

Применить миграции (из папки `backend/`):

```bash
.venv\Scripts\alembic upgrade head
```

Postgres можно поднять через Docker или локально — задайте `DATABASE_URL` в `.env` (шаблон: **`.env.example`** в корне репозитория).

Актуальные миграции включают в том числе **`0010_client_created_at`** и **`0011_landing_locale_content`**. Пока Postgres не запущен или БД не создана, `alembic upgrade` завершится ошибкой подключения — это нормально, сначала поднимите сервер БД.

**Создать БД вручную (если её ещё нет):** подключитесь к Postgres под суперпользователем и выполните `CREATE DATABASE crm_optic;`, затем выдайте права пользователю из `DATABASE_URL`.

### Типичные ошибки в логах uvicorn

| Симптом | Что сделать |
|--------|-------------|
| `database "crm_optic" does not exist` / нет соединения | Создайте БД `crm_optic` или поправьте имя БД в **`DATABASE_URL`**. |
| `relation "users" does not exist` | Подключение к Postgres есть, но схема пустая — выполните **`alembic upgrade head`**. |
| Разные пользователи в `.env` (`POSTGRES_*` vs `DATABASE_URL`) | В приложении используется только **`DATABASE_URL`** — приведите его к реальному пользователю и паролю. |

Эндпоинт **`GET /public/landing-content`** при проблемах с БД возвращает **200** и пустой `payload`, чтобы лендинг не падал; **`POST /auth/login-request`** и остальной CRM по-прежнему требуют рабочую БД и миграции.

### CORS и фронт

- В `.env` задайте **`CORS_ORIGINS`** со всеми origin, с которых открывается сайт (включая `http://IP:3000` в LAN). Дополнительно в коде включён regex для частных подсетей в режиме разработки.
- Для Next.js создайте **`frontend/.env.local`** по образцу **`frontend/.env.example`**: **`NEXT_PUBLIC_API_BASE_URL`** должен указывать на ваш API (например `http://localhost:8000` или `http://192.168.x.x:8000`).

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

## Telegram-бот (long polling)

Бот запускается **вместе с FastAPI** в том же процессе, если в `.env` задан **`TELEGRAM_BOT_TOKEN`** и не отключён **`TELEGRAM_BOT_AUTOSTART`**. Это позволяет деплоить API и бота как один сервис (Railway/Render и т.п.).

Локально отдельно запускать `telegram_crm_login_bot.py` обычно не нужно. Скрипт оставлен для отладки и ручного запуска.

Если API на другом хосте/порту, задайте **`BACKEND_API_BASE_URL`** (например `https://api.example.com`). Иначе используется `http://127.0.0.1:<BACKEND_PORT>`.

**Код не приходит в Telegram:** проверьте, что в окружении API есть `TELEGRAM_BOT_TOKEN`, что процесс API запущен, и что у бота корректный `TELEGRAM_BOT_WEBHOOK_SECRET` (если используется). При старте polling-бот автоматически снимает активный webhook.
