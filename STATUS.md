# CRM Optic — текущий статус проекта

Дата: 2026-03-18

## Что сделано

### Backend (FastAPI)

- Async DB (`AsyncEngine` + `AsyncSession`), Alembic, базовые модели и MVP API.
- CRM API:
  - `GET/POST /clients`, `GET /clients/{id}`
  - `GET/POST /clients/{id}/visits`
  - `GET/POST /clients/{id}/vision-tests`
  - `GET /appointments`, `PATCH /appointments/{id}`
- Публичный endpoint лендинга:
  - `POST /public/booking` (создаёт клиента + запись).
- CORS добавлен через `CORSMiddleware` (`CORS_ORIGINS`).

#### Новый auth flow (owner + admins + Telegram code)

- Удалены старые варианты (Telegram Login Widget callback и старый `/users` flow).
- Реализовано:
  - `POST /auth/login-request`
  - `POST /auth/telegram/start` (для Telegram-бота)
  - `POST /auth/login-verify`
  - `GET /auth/me`
  - `POST /owner/admins` (owner only)
  - `GET /owner/admins` (owner only)
  - `PATCH /owner/admins/{id}` (owner only)
- Безопасность:
  - bcrypt для паролей
  - hash кода входа
  - start-token одноразовый + TTL
  - лимит попыток кода
- Новые сущности/поля:
  - `users`: `phone`, `telegram_username`, `telegram_chat_id`, `is_verified`, `created_at`, `updated_at`
  - `login_verification_codes`
  - `telegram_pending_links`
- Миграция:
  - `0005_owner_admin_login_flow.py`

### Frontend (Next.js + Tailwind)

- Лендинг mobile-first на `/ru`, `/ky`, `/en`.
- i18n: словари `ru/ky/en`, редирект `/ -> /ru`, красивый переключатель языка.
- Мобильное меню, фиксированная CTA-кнопка.
- Форма записи подключена к backend:
  - отправка в `POST /public/booking`
  - валидации, loading/success/error
  - номер Кыргызстана (`+996...`) нормализуется на фронте
  - выбор времени через слоты-кнопки (шаг 30 минут)
- CRM UI добавлен:
  - `/[locale]/crm/login`
  - защищённые страницы `/[locale]/crm/(protected)` (dashboard/clients/users)

## Текущий этап по MVP

- Checkpoint A: готово в коде, нужен рабочий Postgres + миграции в локальном окружении.
- Checkpoint B: готово (модели/миграции).
- Checkpoint C: готово (API MVP + рекомендованные endpoints).
- Checkpoint D: в разработке (базовый CRM UI уже есть, нужна финальная полировка и привязка к новому auth flow на фронте).
- Checkpoint E: почти готово (лендинг + рабочая форма записи).

## Что осталось сделать

### 1) Довести CRM auth на фронте под новый flow

- Логин-экран в 2 шага:
  1. `login-request` (login + password, получить telegram_link)
  2. `login-verify` (код из Telegram)
- Хранение JWT и обновление `crm-auth` клиента.
- Guard для protected CRM-страниц через `GET /auth/me`.

### 2) Интеграция Telegram-бота

- Реализовать обработчик `/start <token>` в боте.
- Вызов backend: `POST /auth/telegram/start` (+ `X-Bot-Secret`).
- Отправка пользователю текста с кодом входа.

### 3) Запуск и стабилизация окружения

- Убедиться, что локальный Postgres доступен.
- Выполнить:
  - `cd backend`
  - `.venv\Scripts\alembic upgrade head`
- Проверить `.env` (JWT, Telegram bot username/secret, CORS, DB URL).

## Команды запуска

### Backend

```bash
cd backend
.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

Открыть: `http://localhost:3000/ru`

