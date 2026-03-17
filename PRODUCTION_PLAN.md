# CRM Optic — Production план (полная версия)

Этот файл — план **полной (production) версии**: архитектура, целевой функционал, целевая структура БД, расширенное API и чекпоинты.

---

## 1) Цели продукта

### 1.1 Лендинг
- Страницы: Главная, О магазине, Услуги, FAQ, Контакты, Адрес+карта, График работы
- Онлайн-запись через сайт
- SEO и высокая скорость загрузки

### 1.2 CRM (админ-панель)
- Роли: Owner / Admin / Doctor
- Записи: kanban + календарь
- Клиенты: профиль, история, фильтры и поиск
- Vision Test: расширенная история и сравнение значений
- Аналитика
- Audit log (история изменений)
- Экспорт (CSV / Excel / PDF)
- Уведомления (Email / Telegram / SMS / WhatsApp)

---

## 2) Стек и архитектура

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy 2.x
- Alembic
- Pydantic
- Uvicorn
- Фоновые задачи: Celery/RQ/APS cheduler (по выбору)

### Frontend
- Next.js (App Router)
- TailwindCSS
- shadcn/ui
- Kanban drag&drop: dnd-kit / React DnD
- Календарь: FullCalendar
- Графики: Chart.js / Recharts

### Архитектурные принципы
- Monorepo `backend/` + `frontend/`
- Явные уровни: `api → services → models/schemas`
- Миграции обязательны (Alembic)
- RBAC и аудит как “сквозная” функциональность

---

## 3) Базовая структура репозитория (production-ready)

```
crm_optic/
  PRODUCTION_PLAN.md
  .env.example
  docker-compose.yml

  backend/
    pyproject.toml
    README.md
    app/
      main.py
      core/
        config.py
        security.py           # JWT, password hashing, RBAC helpers
        database.py
        logging.py
      api/
        deps.py               # db session, current user, permissions
        routers/
          auth.py
          users.py
          roles.py
          services.py
          clients.py
          appointments.py
          calendar.py
          audit_logs.py
          exports.py
          notifications.py
      models/
        base.py
        user.py
        role.py
        client.py
        service.py
        appointment.py
        appointment_status.py  # если делаете таблицу/историю
        visit.py
        vision_test.py
        audit_log.py
        analytics_cache.py
      schemas/
        auth.py
        user.py
        role.py
        client.py
        service.py
        appointment.py
        visit.py
        vision_test.py
        audit_log.py
        export.py
      services/
        scheduling.py         # слоты, пересечения, рабочие часы, длительность услуг
        notifications.py      # email/tg/sms/wa
        audit.py              # запись audit log
        exports.py            # csv/xlsx/pdf
        analytics.py
      workers/
        celery_app.py         # если выбран Celery
        tasks.py
      migrations/
    tests/
      test_api.py
      test_scheduling.py

  frontend/
    package.json
    next.config.js
    src/
      app/
        (marketing)/
          page.tsx
          about/page.tsx
          services/page.tsx
          faq/page.tsx
          contacts/page.tsx
          hours/page.tsx
        (crm)/
          crm/
            layout.tsx
            page.tsx             # dashboard / appointments
            kanban/page.tsx
            calendar/page.tsx
            clients/page.tsx
            clients/[id]/page.tsx
            analytics/page.tsx
            users/page.tsx
            audit/page.tsx
      components/
        marketing/
          AppointmentForm.tsx
        crm/
          KanbanBoard.tsx
          CalendarView.tsx
          AppointmentsTable.tsx
          ClientCard.tsx
          VisionTests.tsx
          Visits.tsx
          AnalyticsCharts.tsx
      lib/
        api.ts
        auth.ts
        permissions.ts
        validators.ts
```

---

## 4) Полный функционал (по модулям)

### 4.1 Лендинг
- SEO (metadata, sitemap, robots, OpenGraph)
- адаптивность
- быстрый рендер и оптимизация ассетов

### 4.2 Запись на прием (site + admin)
- Запись с сайта
- Запись через CRM
- Валидация времени:
  - рабочие часы
  - длительность услуг
  - нет пересечений (по врачу/кабинету)
  - буфер между клиентами (опционально)
- Статусы записи (минимум):
  - New
  - Confirmed
  - In Progress
  - Done
  - Cancelled

### 4.3 Kanban
- Drag & drop между колонками
- Контроль прав (кто может двигать/отменять)
- (желательно) История смены статусов

### 4.4 Календарь (FullCalendar)
- День / неделя / месяц
- Визуализация записей
- Быстрое создание/перенос

### 4.5 Клиенты
- Полный профиль
- История: визиты, проверки, записи, покупки (если добавите продажи)
- Поиск/фильтры: имя, телефон, врач, дата

### 4.6 Vision Test (расширенный)
- История изменений зрения
- Сравнение значений во времени
- Привязка к врачу/визиту/записи (по необходимости)

### 4.7 Аналитика
- Метрики: клиенты, записи, популярные услуги
- Графики: визиты по месяцам, новые клиенты, (опционально) продажи
- (опционально) `analytics_cache` для ускорения

### 4.8 Роли и права (RBAC)
- Owner / Admin / Doctor
- Проверки в backend + скрытие/ограничение UI

### 4.9 Audit log
- кто изменил
- когда
- что изменил (старое/новое)
- минимум: appointment/client/vision_test/visit

### 4.10 Экспорт
- CSV / Excel / PDF
- Экспорт по: клиенты, записи, проверки зрения, визиты

### 4.11 Уведомления и напоминания
- Каналы: Email, Telegram, SMS, WhatsApp
- Типы:
  - “Вы записаны на завтра”
  - “Пора проверить зрение через 6 месяцев”
  - “Ваши линзы готовы”
- Фоновые задачи + планировщик

---

## 5) Целевая структура БД (production)

Таблицы:
- `users`
- `roles` (или enum + `users.role`)
- `clients`
- `services`
- `appointments`
- `appointment_statuses` (или enum + таблица истории статусов)
- `vision_tests`
- `visits`
- `audit_logs`
- `analytics_cache` (опционально)

Рекомендации:
- Индексы по `clients.phone`, `appointments.starts_at`, `appointments.status`, `appointments.doctor_id` (если есть)
- Уникальности/ограничения для предотвращения пересечений (зависит от модели слотов)

---

## 6) API-черновик (production)

### Auth / Users / Roles
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET/POST/PATCH /users`
- `GET/POST/PATCH /roles`

### Services
- `GET/POST/PATCH /services`

### Clients
- `GET/POST/PATCH /clients`
- `GET /clients/{id}`
- `GET/POST /clients/{id}/visits`
- `GET/POST /clients/{id}/vision-tests`

### Appointments
- `GET/POST/PATCH /appointments`
- `POST /appointments/{id}/status` (если есть отдельная история)
- `GET /appointments/calendar?from=...&to=...`

### Kanban / Calendar (может быть теми же ручками appointments)
- выборки по статусам/периодам

### Audit logs
- `GET /audit-logs`

### Exports
- `GET /exports/clients.(csv|xlsx|pdf)`
- `GET /exports/appointments.(csv|xlsx|pdf)`
- `GET /exports/vision-tests.(csv|xlsx|pdf)`
- `GET /exports/visits.(csv|xlsx|pdf)`

### Notifications
- `POST /notifications/test` (внутренний)

---

## 7) Roadmap (этапы после MVP)

### Этап 1 (1–2 недели): безопасность и роли
- JWT, хэширование паролей
- RBAC Owner/Admin/Doctor
- Разделение доступа к данным

### Этап 2 (1–2 недели): статусы + kanban
- Расширение статусов
- Kanban + DnD
- История смен статуса (или audit log)

### Этап 3 (1–2 недели): календарь + расписание
- FullCalendar
- Валидация пересечений и слотов
- Админ-редактирование записей

### Этап 4 (1–2 недели): поиск/фильтры, аналитика, экспорт
- Фильтрация
- Графики
- CSV/Excel, потом PDF

### Этап 5 (по мере готовности): уведомления
- Email/Telegram
- SMS/WhatsApp через провайдера
- Планировщик напоминаний (завтра / через 6 месяцев)

---

## 8) Progress / Checkpoints (production)

### Checkpoint P1 — Роли и безопасность
- [ ] JWT auth
- [ ] Owner/Admin/Doctor
- [ ] RBAC на API
- [ ] Ограничение UI по ролям

### Checkpoint P2 — Статусы и kanban
- [ ] Статусы: New/Confirmed/In Progress/Done/Cancelled
- [ ] Kanban DnD
- [ ] История смен статуса (или audit log)

### Checkpoint P3 — Календарь и пересечения
- [ ] FullCalendar (day/week/month)
- [ ] Слоты и длительность услуг
- [ ] Запрет пересечений

### Checkpoint P4 — Поиск/аналитика/экспорт
- [ ] Поиск и фильтрация
- [ ] Аналитика (графики)
- [ ] Экспорт CSV/Excel/PDF

### Checkpoint P5 — Уведомления
- [ ] Email
- [ ] Telegram
- [ ] SMS (провайдер)
- [ ] WhatsApp (провайдер/Business API)

