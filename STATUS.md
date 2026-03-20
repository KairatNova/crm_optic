# CRM Optic — текущий статус проекта

Дата обновления: **2026‑03‑20**

## Что сделано (актуально в коде)

### Backend (FastAPI)

- Async DB (`AsyncEngine` + `AsyncSession`), Alembic, модели MVP.
- **Публичный лендинг:** `POST /public/booking` — создаёт клиента и запись.
- **CRM API (под JWT):**
  - `GET/POST /clients`, `GET /clients/{id}`
  - `GET/POST /clients/{id}/visits`
  - `GET/POST /clients/{id}/vision-tests`
  - `GET/POST /appointments`, `GET /appointments`, `PATCH /appointments/{id}`
- **CORS:** `CORSMiddleware`, переменная `CORS_ORIGINS`.
- **Конфиг:** в `app/core/config.py` загружаются только реальные `.env` (без `.env.example`), чтобы секреты не затирались пустыми значениями.

#### Auth для CRM (новый поток: логин + код из Telegram)

- `POST /auth/login-request` — логин (username или телефон) + пароль → ссылка на бота с `start_token`.
- `POST /auth/telegram/start` — вызывается ботом после `/start` (привязка чата, выдача кода).
- `POST /auth/login-verify` — проверка кода → JWT.
- `GET /auth/me` — текущий пользователь.
- **Owner:** `POST/GET/PATCH /owner/admins` — создание и управление админами (username/phone, пароль и т.д.).
- Безопасность: bcrypt для паролей, хэш кода, TTL, лимит попыток (см. `docs/CRM_TELEGRAM_AUTH.md`).
- Миграции: в том числе поток owner/admin (`0005` и связанные изменения схемы `users`).

### Frontend (Next.js + Tailwind)

- Лендинг mobile-first: `/ru`, `/ky`, `/en`, i18n, редирект `/ → /ru`.
- Форма записи → `POST /public/booking`, валидация телефона KG, слоты времени.
- **Каркас CRM:**
  - `/{locale}/crm/login` — **новый поток:** `login-request` → бот → `login-verify`, JWT + `GET /auth/me`.
  - защищённые страницы: список записей, карточка клиента (visits / vision-tests), страница админов для owner (`/owner/admins`).
- В шапке лендинга кнопка **«Вход»** (и в мобильном меню) → CRM login.

### Тесты backend

- В `backend/tests` — pytest: health, public booking, clients, appointments, visits, vision-tests, БД.
- Запуск из `backend/`: `pytest -q`.

---

## Frontend ↔ backend (auth)

CRM UI синхронизирован с текущим API: без Telegram Login Widget, без `/auth/telegram/callback` и `/users/me`. Подробности: **`docs/CRM_TELEGRAM_AUTH.md`**.

---

## Чекпоинты MVP (кратко)

| Checkpoint | Статус |
|------------|--------|
| A — каркас + Postgres | Код готов; на машине нужны живой Postgres и `alembic upgrade head`. |
| B — модели/миграции | Готово (включая расширения под новый auth). |
| C — API MVP | Готово + публичный booking. |
| D — CRM UI | Каркас + **новый auth на фронте**; полировка по мере необходимости. |
| E — лендинг | Почти готово (страницы + форма записи). |
| F — демо/прод | Валидации/деплой — по мере необходимости. |

---

## Что осталось сделать (приоритет)

1. **Telegram-бот:** обработка `/start <token>`, вызов `POST /auth/telegram/start`, отправка кода пользователю.
2. **Owner bootstrap:** первый owner создаётся через сиды/скрипт/ручную запись в БД с хэшем пароля (уточнить в вашем процессе развёртывания).
3. **Production roadmap:** kanban, календарь, аналитика — см. `PRODUCTION_PLAN.md`.

---

## Команды запуска

### Backend

```bash
cd backend
alembic upgrade head   # или .venv/bin/alembic
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

Открыть лендинг: `http://localhost:3000/ru`
