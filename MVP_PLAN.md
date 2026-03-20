# CRM Optic — MVP план (10–14 дней)

Этот файл — план **только MVP** (минимально рабочая CRM + лендинг), чтобы:
- уже можно было принимать клиентов
- использовать в реальном магазине
- показать работодателю / заказчику

---

## 1) Цели MVP

### 1.1 Лендинг
- Главная
- О магазине
- Услуги
- Контакты (адрес, телефон)
- График работы
- Форма записи: имя, телефон, услуга, дата, время, комментарий
- Логика: отправка → API → сохранение в БД → отображение в CRM

### 1.2 CRM (админ-панель)
- Список записей (appointments): имя, телефон, услуга, дата/время, статус `new|done`
- Карточка клиента (clients): имя, телефон, email, дата рождения
- История визитов (visits): дата, комментарий
- Vision Test (vision_tests): дата, OD/OS (SPH, CYL, AXIS), PD, комментарий врача

---

## 2) Рекомендуемый стек MVP

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy 2.x
- Alembic
- Pydantic
- Uvicorn

### Frontend
Рекомендуется сразу Next.js, чтобы потом не мигрировать:
- Next.js (App Router)
- TailwindCSS
- shadcn/ui

---

## 3) Базовая структура репозитория (для MVP)

```
crm_optic/
  MVP_PLAN.md
  .env.example
  docker-compose.yml

  backend/
    pyproject.toml            # или requirements.txt
    app/
      main.py
      core/
        config.py
        security.py           # MVP: упрощенно
        database.py
      api/
        deps.py
        routers/
          health.py
          appointments.py
          clients.py
          visits.py
          vision_tests.py
          auth.py             # MVP: простой вход (один admin)
      models/
        base.py
        user.py
        client.py
        appointment.py
        visit.py
        vision_test.py
      schemas/
        appointment.py
        client.py
        visit.py
        vision_test.py
        user.py
      migrations/
    tests/
      test_smoke.py

  frontend/
    package.json
    src/
      app/
        page.tsx              # лендинг
        about/page.tsx
        services/page.tsx
        contacts/page.tsx
        hours/page.tsx
        crm/
          layout.tsx
          page.tsx            # список записей
          clients/
            [id]/page.tsx     # карточка клиента
      components/
        AppointmentForm.tsx
        crm/
          AppointmentsTable.tsx
          ClientCard.tsx
          VisionTests.tsx
          Visits.tsx
      lib/
        api.ts
```

---

## 4) MVP: API (обязательные)
- `POST /appointments` — создать запись
- `GET /appointments` — список записей
- `POST /clients` — создать клиента
- `GET /clients` — список клиентов
- `GET /clients/{id}` — карточка клиента

### 4.1 MVP: API (рекомендуемые для удобства CRM)
- `PATCH /appointments/{id}` — менять `status` (`new|done`), дату/время/комментарий
- `GET /clients/{id}/visits`
- `POST /clients/{id}/visits`
- `GET /clients/{id}/vision-tests`
- `POST /clients/{id}/vision-tests`

---

## 5) Scope MVP (что НЕ входит)
- Kanban
- Календарь
- Сложные роли Owner/Admin/Doctor (можно один admin)
- Audit log
- Экспорт (CSV/Excel/PDF)
- Уведомления SMS/WhatsApp/Telegram
- Жесткая проверка пересечений записей (в MVP достаточно “не в прошлом” + базовые рамки рабочего дня)

---

## 6) MVP таймлайн (10–14 дней)

### Дни 1–2 — каркас + БД
- Поднять Postgres (docker-compose)
- Инициализировать FastAPI проект
- Подключить SQLAlchemy + Alembic
- Миграции: `users`, `clients`, `appointments`, `visits`, `vision_tests`

### Дни 3–4 — основные API
- `POST/GET appointments`, `POST/GET clients`, `GET client by id`
- (рекоменд.) `PATCH appointments`, endpoints для visits и vision_tests
- Минимальная авторизация:
  - вариант A: один admin (логин/пароль в env)
  - вариант B: простой JWT без ролей

### Дни 5–9 — CRM UI
- `/crm` список записей (таблица, фильтр по дате, кнопка “Done/New”)
- `/crm/clients/[id]` карточка клиента + вкладки:
  - Данные клиента
  - Visits (список + форма добавления)
  - Vision Tests (список + форма добавления)

### Дни 10–11 — лендинг + форма записи
- Страницы лендинга
- Компонент формы записи
- Интеграция с `POST /appointments`

### Дни 12–14 — полировка и запуск
- Валидации (телефон, дата/время)
- Простейшая защита от спама (rate limit / captcha при необходимости)
- Докеризация backend + миграции при старте
- Минимальные smoke-tests API
- Деплой (VPS) или локально для демо

---

## 7) Definition of Done (MVP)
- С лендинга можно отправить запись, и она появляется в CRM
- В CRM можно:
  - просмотреть записи и отметить `done`
  - открыть клиента и добавить визит
  - добавить результаты проверки зрения (vision test)
- Данные сохраняются в Postgres и переживают перезапуск

---

## 8) Progress / Checkpoints (продолжить с нужного места)

### Checkpoint A — Проект поднят (backend+db)
- [ ] docker-compose поднимает Postgres *(на машине разработчика)*
- [x] backend стартует (health endpoint)
- [x] alembic миграции применяются *(в репозитории есть миграции; нужен живой Postgres)*

### Checkpoint B — Модели и миграции готовы
- [x] users *(+ поля под новый CRM auth)*
- [x] clients
- [x] appointments
- [x] visits
- [x] vision_tests

### Checkpoint C — API MVP готово
- [x] POST/GET appointments
- [x] POST/GET clients
- [x] GET client by id
- [x] visits endpoints (рекоменд.)
- [x] vision_tests endpoints (рекоменд.)
- [x] публичный `POST /public/booking`
- [x] CRM auth: login-request / telegram/start / login-verify, `/auth/me`, `/owner/admins`

### Checkpoint D — CRM MVP готова
- [x] список записей *(UI есть)*
- [x] карточка клиента *(UI есть)*
- [x] visits UI *(UI есть)*
- [x] vision tests UI *(UI есть)*
- [ ] **frontend переведён на новый auth** (сейчас часть вызовов устарела — см. `STATUS.md`)

### Checkpoint E — Лендинг MVP готов
- [x] страницы (главная на локалях)
- [x] форма записи работает и сохраняет в БД

### Checkpoint F — MVP готов к демо/магазину
- [x] базовые валидации *(частично: телефон/время на лендинге, API)*
- [ ] минимальная защита *(rate limit и т.п. — по желанию)*
- [x] деплой/запуск инструкция *(README + этот файл + `STATUS.md`)*

