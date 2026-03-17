# CRM Optic — план разработки (MVP + Production)

Этот файл — “единая точка правды” по структуре проекта и дорожной карте.  
Используйте секцию **Progress / Checkpoints**, чтобы продолжать работу на другом устройстве без потери контекста.

---

## 1) Цели продукта

### 1.1 Лендинг
- Страницы: Главная, О магазине, Услуги, Контакты (адрес/телефон), График работы
- Форма записи: имя, телефон, услуга, дата, время, комментарий
- Логика: отправка → API → сохранение в БД → отображение в CRM

### 1.2 CRM (админ-панель)
Минимально для MVP:
- Список записей (appointments) с полями: имя, телефон, услуга, дата/время, статус (new/done)
- Карточка клиента (clients): имя, телефон, email, дата рождения
- История визитов (visits): дата, комментарий
- Vision Test (vision_tests): дата, OD/OS (SPH, CYL, AXIS), PD, комментарий врача

Полная версия (production) — расширение до ролей, kanban, календаря, аналитики, audit log, экспортов и т.д.

---

## 2) Рекомендуемый стек (единый для MVP и Production)

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy 2.x
- Alembic (миграции)
- Pydantic (DTO)
- Uvicorn

### Frontend
Рекомендуется сразу Next.js (чтобы не мигрировать с React SPA позже):
- Next.js (App Router)
- TailwindCSS
- shadcn/ui

---

## 3) Базовая структура репозитория (monorepo)

```
crm_optic/
  PROJECT_PLAN.md
  .env.example
  docker-compose.yml

  backend/
    pyproject.toml            # или requirements.txt
    README.md
    app/
      main.py                 # FastAPI app
      core/
        config.py             # env, настройки
        security.py           # auth utils (MVP: упрощенно)
        database.py           # engine, session
      api/
        deps.py               # зависимости (db session, current user)
        routers/
          health.py
          appointments.py
          clients.py
          visits.py
          vision_tests.py
          auth.py             # MVP: простой вход; Production: JWT + RBAC
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
      services/
        scheduling.py         # Production: слоты/пересечения
        notifications.py      # Production: email/sms/tg/wa
      migrations/             # Alembic versions/
    tests/
      test_smoke.py

  frontend/
    package.json
    next.config.js
    tailwind.config.ts
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
            page.tsx          # список клиентов (опционально в MVP)
            [id]/page.tsx     # карточка клиента
      components/
        AppointmentForm.tsx
        crm/
          AppointmentsTable.tsx
          ClientCard.tsx
          VisionTests.tsx
          Visits.tsx
      lib/
        api.ts                # fetch wrapper
        validators.ts         # zod schemas (опционально)
```

> Примечание: если хотите отделить лендинг и CRM по доменам/поддоменам — структура останется почти такой же, просто добавятся разные layout/маршруты.

---

## 4) MVP (10–14 дней) — конкретный план

### 4.1 Scope MVP (что входит)

#### Лендинг
- Главная
- О магазине
- Услуги
- Контакты (адрес, телефон)
- График работы
- Форма записи (поля: имя, телефон, услуга, дата, время, комментарий)
- Отправка формы в API и сохранение в БД

#### Backend API (минимум)
- `POST /appointments` — создать запись
- `GET /appointments` — список записей
- `POST /clients` — создать клиента
- `GET /clients` — список клиентов
- `GET /clients/{id}` — карточка клиента

#### CRM
- Список записей: имя, телефон, услуга, дата/время, статус `new|done`
- Карточка клиента: имя, телефон, email, дата рождения
- История визитов: дата, комментарий
- Vision Test: дата, OD/OS (SPH/CYL/AXIS), PD, комментарий врача

### 4.2 Scope MVP (что НЕ входит)
- Kanban
- Календарь
- Сложные роли Owner/Admin/Doctor (можно один admin)
- Audit log
- Экспорт (CSV/Excel/PDF)
- Уведомления SMS/WhatsApp/Telegram (можно оставить “позже”)
- Жесткая проверка пересечений записей (в MVP можно минимально проверять “не в прошлом”)

### 4.3 MVP по дням (реалистичный таймлайн)

#### Дни 1–2 — каркас + БД
- Поднять Postgres (docker-compose)
- Инициализировать FastAPI проект
- Подключить SQLAlchemy + Alembic
- Создать миграции: `users`, `clients`, `appointments`, `visits`, `vision_tests`
- Сиды (опционально): тестовые услуги (если услуги отдельной таблицей появятся позже)

#### Дни 3–4 — основные API
- Реализовать `POST/GET appointments`, `POST/GET clients`, `GET client by id`
- Добавить (для удобства CRM) в MVP:
  - `PATCH /appointments/{id}` (статус `new/done`, дата/время/комментарий)
  - `POST/GET /clients/{id}/visits`
  - `POST/GET /clients/{id}/vision-tests`
- Минимальная авторизация:
  - вариант A: один admin (логин/пароль в env)
  - вариант B: простой JWT без ролей

#### Дни 5–9 — CRM UI
- `/crm` список записей (таблица, фильтр по дате, кнопка “Done/New”)
- `/crm/clients/[id]` карточка клиента + вкладки:
  - Данные клиента
  - Visits (список + форма добавления)
  - Vision Tests (список + форма добавления)

#### Дни 10–11 — лендинг + форма записи
- Страницы лендинга
- Компонент формы записи
- Интеграция с `POST /appointments`

#### Дни 12–14 — полировка и запуск
- Валидации (телефон, дата/время)
- Простейшая защита от спама (rate limit / captcha по необходимости)
- Докеризация backend + миграции при старте
- Минимальные smoke-tests API
- Деплой (VPS) или локально для демо

### 4.4 Definition of Done для MVP
- С лендинга можно отправить запись, и она появляется в CRM
- В CRM можно:
  - просмотреть записи и отметить `done`
  - открыть клиента и добавить визит
  - добавить результаты проверки зрения (vision test)
- Данные сохраняются в Postgres и переживают перезапуск

---

## 5) Production (полная версия) — план расширения

### 5.1 Функционал лендинга
- SEO (Next.js)
- адаптивность
- улучшенный UI/UX (Tailwind + shadcn)
- оптимизация скорости (images, caching, metadata)

### 5.2 Запись на прием (site + admin)
- Запись с сайта (лендинг)
- Запись через администратора в CRM
- Валидация времени:
  - рабочие часы
  - длительность услуг
  - нет пересечений (по врачу/кабинету)
  - буфер между клиентами (опционально)

### 5.3 CRM: Kanban
- Статусы:
  - New
  - Confirmed
  - In Progress
  - Done
  - Cancelled
- Drag & drop (React DnD / dnd-kit)
- История смены статусов (можно в audit log)

### 5.4 CRM: Календарь
- День / неделя / месяц
- FullCalendar (или аналог)
- Быстрое создание/перенос записи

### 5.5 Клиенты (полный профиль)
- История (визиты, проверки, записи, покупки — если добавите продажи)
- Фильтры и поиск:
  - имя
  - телефон
  - врач
  - дата

### 5.6 Vision Test (расширенный)
- История изменений зрения
- Сравнение значений во времени (график/таблица “было/стало”)
- Привязка к врачу, визиту, записи (если нужно)

### 5.7 Аналитика
- Метрики:
  - клиенты
  - записи
  - популярные услуги
- Графики:
  - визиты по месяцам
  - новые клиенты
  - (опционально) продажи
- Chart.js / Recharts
- (опционально) `analytics_cache` для ускорения

### 5.8 Роли и права
- Owner / Admin / Doctor
- RBAC в backend + маршрутизация/скрытие UI на frontend

### 5.9 Audit log
- кто изменил
- когда
- что изменил (старое/новое)
- минимум: appointment/client/vision_test/visit

### 5.10 Экспорт
- CSV / Excel / PDF
- Экспорт по:
  - клиенты
  - записи
  - проверки зрения
  - визиты

### 5.11 Уведомления и напоминания
- Каналы:
  - Email (быстро)
  - Telegram (быстро)
  - SMS (через провайдера)
  - WhatsApp (через провайдера/Business API)
- Типы:
  - “Вы записаны на завтра”
  - “Пора проверить зрение через 6 месяцев”
  - “Ваши линзы готовы”
- Фоновые задачи (celery/rq/apscheduler)

---

## 6) Production-структура БД (целевая)

Минимальный целевой набор таблиц:
- `users`
- `roles` (или enum + user.role)
- `clients`
- `services`
- `appointments`
- `appointment_statuses` (или enum + history table)
- `vision_tests`
- `visits`
- `audit_logs`
- `analytics_cache` (опционально)

---

## 7) API-черновик (MVP + расширения)

### MVP (обязательные)
- `POST /appointments`
- `GET /appointments`
- `POST /clients`
- `GET /clients`
- `GET /clients/{id}`

### MVP (рекомендуемые для удобства CRM)
- `PATCH /appointments/{id}`
- `GET /clients/{id}/visits`
- `POST /clients/{id}/visits`
- `GET /clients/{id}/vision-tests`
- `POST /clients/{id}/vision-tests`

### Production (добавится)
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `POST/GET/PATCH /services`
- `GET /appointments/calendar?from=...&to=...`
- `POST /appointments/{id}/status` (если отдельная история статусов)
- `GET /audit-logs`
- `GET /exports/...`
- `POST /notifications/test` (внутренний)

---

## 8) Progress / Checkpoints (продолжить с нужного места)

Отмечайте прогресс прямо здесь.

### Checkpoint A — Проект поднят (backend+db)
- [ ] docker-compose поднимает Postgres
- [ ] backend стартует (health endpoint)
- [ ] alembic миграции применяются

### Checkpoint B — Модели и миграции готовы
- [ ] users
- [ ] clients
- [ ] appointments
- [ ] visits
- [ ] vision_tests

### Checkpoint C — API MVP готово
- [ ] POST/GET appointments
- [ ] POST/GET clients
- [ ] GET client by id
- [ ] visits endpoints (рекоменд.)
- [ ] vision_tests endpoints (рекоменд.)

### Checkpoint D — CRM MVP готова
- [ ] список записей
- [ ] карточка клиента
- [ ] visits UI
- [ ] vision tests UI

### Checkpoint E — Лендинг MVP готов
- [ ] страницы
- [ ] форма записи работает и сохраняет в БД

### Checkpoint F — MVP готов к демо/магазину
- [ ] базовые валидации
- [ ] минимальная защита
- [ ] деплой/запуск инструкция

