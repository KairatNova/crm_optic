# Что сделано (реализация плана)

Краткий список изменений по темам: уведомления владельцу, аудит, даты в БД, бэкапы, фокус формы записи, тесты фронта.

## 1. Уведомления владельцу о новой записи с лендинга

- После успешного `POST /public/booking` запускается фоновая задача (FastAPI `BackgroundTasks`).
- Логика вынесена в `backend/app/services/owner_notifications.py`.
- **Telegram:** сообщение уходит всем активным пользователям с `role=owner` и заполненным `telegram_chat_id`, если задан `TELEGRAM_BOT_TOKEN` и включены уведомления.
- **Email (опционально):** при настроенном SMTP и `OWNER_NOTIFY_EMAIL` (через запятую) отправляется письмо через `smtplib` в `asyncio.to_thread`.
- Переменные окружения: `backend/app/core/config.py` (`OWNER_NOTIFY_ENABLED`, `OWNER_NOTIFY_EMAIL`, `SMTP_*`).
- Ошибки доставки логируются, ответ клиенту лендинга остаётся `201`.
- В тестах уведомления отключены автопатчем в `backend/tests/conftest.py`, чтобы фон не ходил в «чужой» engine SQLite.
- Описание для деплоя: раздел в `backend/README.md`.

## 2. Аудит (записи и клиенты)

- **Записи:** при создании с лендинга пишется строка в `appointment_audit` (`field_name=created`, `new_value=landing`, `user_id=null`). При создании записи из CRM — аналогично с `new_value=crm` и `user_id` автора; для `POST /appointments` добавлен явный `Depends(get_current_user)`.
- **Клиенты:** новая таблица `client_audit`, модель `backend/app/models/client_audit.py`, миграция `0012_client_audit`. Аудит при создании, `PATCH` (по изменённым полям) и мягком удалении.
- **API:** `GET /clients/{client_id}/audit` — список записей аудита (только для авторизованного CRM, как и остальные `/clients/*`).
- На **лендинге аудит не отображается** — только хранение и API для CRM.

## 3. Единый формат дат (timezone-aware) в моделях

- Добавлен `backend/app/core/time.py` с `utc_now()`.
- В SQLAlchemy-моделях заменены `default`/`onupdate` с `datetime.utcnow` на `utc_now`.
- В роутерах визитов / тестов зрения вместо `datetime.utcnow()` используется `utc_now()` из того же модуля.

## 4. Резервные копии БД

- Инструкция: `docs/DATABASE_BACKUPS.md` (`pg_dump` / `pg_restore`, Railway/Render).
- Ссылка из `backend/README.md`.

## 5. Фокус после перехода на `#booking`

- В `frontend/src/components/BookingForm.tsx`: при хеше `#booking` фокус на первое поле (имя), обработка `hashchange`, сброс хеша через `history.replaceState` после фокуса.

## 6. Тесты фронта

- Vitest + Testing Library: `frontend/vitest.config.ts`, скрипты `npm run test` / `npm run test:watch` в `frontend/package.json`.
- Тест входа CRM: `frontend/src/__tests__/crm-login.test.tsx`.
- Тест формы записи: `frontend/src/components/BookingForm.test.tsx`.

## Дополнительно по бэкенду

- В `backend/tests/test_clients.py` добавлена проверка `GET /clients/{id}/audit` после создания клиента.

## Что сделать после pull

1. Применить миграции: `cd backend && alembic upgrade head`.
2. Для уведомлений в Telegram у **owner** должен быть задан `telegram_chat_id` (после входа через CRM-бота или вручную в БД).
3. Для email — заполнить `SMTP_*` и `OWNER_NOTIFY_EMAIL` при необходимости.
