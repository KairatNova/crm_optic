# CRM Optic — текущий статус проекта

Дата обновления: **2026‑03‑17**

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
