# CRM Optic — текущий статус проекта

Дата: 2026‑03‑18

## Что сделано

### Backend (FastAPI)

- **Async БД слой**: `AsyncEngine` + `AsyncSession` (`backend/app/core/database.py`).
- **Конфиг из env**: `DATABASE_URL`, JWT/Telegram, CORS (`backend/app/core/config.py`).
- **Alembic**: настроены миграции (`backend/migrations/*`).
- **Таблицы (MVP)**:
  - `users`, `clients`, `appointments`, `visits`, `vision_tests`
  - Доп. поля:
    - `users`: `role`, `full_name`, `email`, `telegram_id` (unique), `hashed_password` nullable
    - `clients`: `gender`
    - `vision_tests`: `va_r`, `va_l`, `lens_type`, `frame_model` (+ уже были `axis`)
- **API (CRM, защищено JWT)**:
  - `GET/POST /clients`, `GET /clients/{id}`
  - `GET/POST /clients/{id}/visits`
  - `GET/POST /clients/{id}/vision-tests`
  - `GET /appointments`, `PATCH /appointments/{id}`
  - `POST /users` (только owner) — добавление админов по `telegram_id`
  - `GET /users/me`
- **Публичная запись с лендинга (без входа)**:
  - `POST /public/booking` — создаёт клиента + запись (status=`new`)
- **Auth в CRM (Telegram Login Widget)**:
  - `GET /auth/telegram/callback` — проверка подписи Telegram → выдача JWT
  - Описание флоу: `docs/CRM_TELEGRAM_AUTH.md`
- **CORS**:
  - Добавлен `CORSMiddleware` (настраивается через `CORS_ORIGINS`, по умолчанию `http://localhost:3000`)

### Frontend (Next.js + Tailwind)

- **Лендинг** (mobile-first, стиль как в референсе) на маршрутах:
  - `/ru`, `/ky`, `/en`
- **Мультиязычность**:
  - словари: `frontend/src/i18n/{ru,ky,en}.ts`
  - редирект `/` → `/ru` + сохранение locale в cookie: `frontend/src/middleware.ts`
  - современный переключатель языка: `frontend/src/components/LanguageSwitcher.tsx`
  - мобильное меню: `frontend/src/components/MobileMenu.tsx`
- **Форма записи подключена к backend**:
  - Отправка в `POST /public/booking`
  - UX: loading + success/error
  - Телефон Кыргызстана: нормализация/валидация → отправляется как `+996XXXXXXXXX`
  - Выбор времени: **слоты-кнопки** (09:00–18:00, шаг 30 минут)
  - Компонент: `frontend/src/components/BookingForm.tsx`
- **API base URL**:
  - `NEXT_PUBLIC_API_BASE_URL` (по умолчанию `http://localhost:8000`)

## На каком этапе сейчас проект

По `MVP_PLAN.md`:

- **Checkpoint A (каркас + запуск)**: в коде готово, зависит от локального Postgres и применения миграций.
- **Checkpoint B (модели + миграции)**: **готово** (миграции `0001`–`0004`).
- **Checkpoint C (API MVP)**: **готово** (clients/appointments + visits + vision-tests) + добавлен публичный booking.
- **Checkpoint E (лендинг MVP)**: **почти готово** — UI + отправка записи уже есть.
- **Checkpoint D (CRM UI)**: **ещё не сделано** (только backend и Telegram auth готовы).

Итого: **MVP сейчас упёрся в CRM UI и в стабилизацию запуска БД/миграций на вашей машине.**

## Что нужно сделать дальше (следующие шаги)

### 1) CRM UI (Next.js)

- Страница `/crm/login` с **Telegram Login Widget** (кнопка).
- Хранение JWT (для MVP можно localStorage, лучше позже cookie).
- Защита роутов `/crm/*` (если нет токена → редирект на login).
- `/crm`:
  - список записей (таблица, фильтр по дате/статусу)
  - кнопка смены статуса `new/done` (через `PATCH /appointments/{id}`)
- `/crm/clients/[id]`:
  - профиль клиента
  - вкладки: визиты и vision tests (списки + формы добавления)
- Для owner: `/crm/users` — добавление админов по `telegram_id`.

### 2) Улучшения backend под прод

- Валидация `starts_at` по рабочим часам (и/или шаг 30 мин) + базовая защита от спама (rate limit).
- Добавить поиск/фильтры (по телефону/имени) для CRM.

### 3) Инфраструктура/запуск

- Убедиться, что **локальный Postgres** запущен и доступен, затем:
  - `cd backend`
  - `.venv\Scripts\alembic upgrade head`
- Привести `.env` (не `.env.example`) под вашу локальную базу и токены.

## Команды запуска (локально)

### Backend

Из `backend/`:

- миграции:
  - `.venv\Scripts\alembic upgrade head`
- запуск:
  - `.venv\Scripts\uvicorn app.main:app --reload --port 8000`

### Frontend

Из `frontend/`:

- `npm run dev`
- открыть `http://localhost:3000/ru`

