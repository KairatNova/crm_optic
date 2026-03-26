# CRM Optic — текущий статус проекта

Дата обновления: **2026‑03‑26**

## Что сделано (актуально в коде)

### Backend (FastAPI)

- Async DB (`AsyncEngine` + `AsyncSession`), Alembic, модели MVP.
- **Публичный лендинг:** `POST /public/booking` — создаёт клиента и запись (лимит запросов с одного IP: **20/мин**, см. `app/core/rate_limit.py`).
- **Публичный контент лендинга:** `GET /public/landing-content?locale=ru` — JSON-переопределения текстов (пустой `payload`, если не задано в CRM).
- **Аналитика (CRM, JWT):** `GET /analytics/summary` — сводка по клиентам/записям и популярным услугам (период опционально `from_date`, `to_date`).
- **Контент лендинга (owner, JWT):** `GET/PUT /owner/landing-content` — сохранение `payload` по локали.
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
- Миграции: в том числе поток owner/admin (`0005` и связанные изменения схемы `users`), **`0010_client_created_at`** (поле `clients.created_at` для метрик), **`0011_landing_locale_content`** (таблица `landing_locale_content`).

### Frontend (Next.js + Tailwind)

- Лендинг mobile-first: `/ru`, `/ky`, `/en`, i18n, редирект `/ → /ru`.
- Форма записи → `POST /public/booking`, валидация телефона KG.
- Выбор времени в форме записи: только значения с шагом **5 минут** в диапазоне **10:00–21:00**.
- **Каркас CRM:**
  - `/{locale}/crm/login` — **новый поток:** `login-request` → бот → `login-verify`, JWT + `GET /auth/me`.
  - защищённые страницы: список записей, карточка клиента (visits / vision-tests), страница админов для owner (`/owner/admins`).
- В шапке лендинга кнопка **«Вход»** (и в мобильном меню) → CRM login.
- Обновлён лендинг:
  - добавлен брендовый логотип/визуальный блок в hero и header;
  - добавлены секции "Почему выбирают нас" и "Контакты и график";
  - расширены словари `ru/en/ky` под новые блоки.
- Начат редизайн CRM shell (в стиле modern admin):
  - обновлены sidebar/topbar/mobile-tabs в `CrmProtectedShell`;
  - добавлены KPI-карточки на странице записей (`crm/(protected)/page.tsx`).
- **CRM:** страницы **Календарь** (`/crm/calendar`), **Аналитика**, **Контент сайта** (только owner) — редактирование текстов лендинга по локали; лендинг подмешивает ответ API с `revalidate: 60`.
- Примеры переменных: корневой **`.env.example`**, **`frontend/.env.example`** (`NEXT_PUBLIC_API_BASE_URL`).

### Тесты backend

- В `backend/tests` — pytest: health, public booking, clients, appointments, visits, vision-tests, БД.
- Запуск из `backend/`: `pytest -q`.

---

## Frontend ↔ backend (auth)

CRM UI синхронизирован с текущим API: без Telegram Login Widget, без `/auth/telegram/callback` и `/users/me`. Подробности: **`docs/CRM_TELEGRAM_AUTH.md`**.

---

## Последние правки (март 2026)

1. **Лендинг UI**
   - Внедрён новый брендовый визуальный стиль.
   - Добавлены продающие секции и более презентабельная структура главной страницы.
2. **Форма записи**
   - Время выбирается только из допустимого списка: шаг 5 минут, интервал 10:00–21:00.
3. **CORS (dev)**
   - Исправлены preflight-ошибки для локальной сети (`localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`).
4. **CRM UI refresh**
   - Обновлена оболочка CRM и визуальные метрики на странице записей.
5. **Инфра и безопасность публичной записи**
   - Расширены шаблоны env (CORS, `BACKEND_API_BASE_URL` для бота, фронт).
   - Rate limit на `POST /public/booking`.
6. **Продукт**
   - Недельный календарь записей в CRM.
   - CMS лендинга (owner): API + страница «Контент сайта».
7. **Telegram-бот**
   - Логирование ошибок, поддержка `BACKEND_API_BASE_URL`, см. `docs/CRM_TELEGRAM_AUTH.md`.

---

## Источники дизайна CRM (референсы)

- [NextAdminHQ / nextjs-admin-dashboard](https://github.com/NextAdminHQ/nextjs-admin-dashboard.git)
- [NextAdmin demo](https://demo.nextadmin.co/)
- [Studio Admin (Next + shadcn style)](https://next-shadcn-admin-dashboard.vercel.app/dashboard/default)
- [CoreUI Free React Admin Template](https://coreui.io/product/free-react-admin-template/#live-preview)

Примечание: в проекте выбран курс на **Next.js/Tailwind-first** стилизацию (ближе к NextAdmin/shadcn), с адаптацией под существующую структуру CRM и API.

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

1. **Деплой:** на сервере поднять Postgres, выполнить **`alembic upgrade head`** (включая `0010` и `0011`), выставить **`CORS_ORIGINS`** и **`NEXT_PUBLIC_API_BASE_URL`** под реальные домены.
2. **Telegram-бот в проде:** держать процесс `telegram_crm_login_bot.py` (systemd/Docker) или webhook; см. раздел в **`docs/CRM_TELEGRAM_AUTH.md`**.
3. **Owner bootstrap:** первый owner — сид/скрипт/ручная запись в БД (см. документацию).
4. **Углубление:** полноценный календарь (месяц, drag), расширение CMS (услуги, отзывы), rate limit за Redis при нескольких воркерах — см. `PRODUCTION_PLAN.md`.

---

## Команды запуска

### Backend

```bash
cd backend
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Бот (отдельный процесс, из `backend/` с активированным venv):**

```bash
python telegram_crm_login_bot.py
```

### Frontend

```bash
cd frontend
npm run dev
```

Открыть лендинг: `http://localhost:3000/ru`
