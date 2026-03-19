# План регистрации/авторизации (текущий)

Дата: 2026-03-18

## Бизнес-правила

- Открытой регистрации для всех нет.
- Доступ в CRM только для пользователей, которых добавил `owner`.
- Роли:
  - `owner` — создаёт и управляет админами
  - `admin` — работает в CRM, но не создаёт других админов

## Модель данных (цель)

### Таблица `users`

- `id`
- `username` (nullable, unique, normalized lower)
- `phone` (nullable, unique, normalized E.164, KG +996)
- `telegram_username` (nullable)
- `telegram_chat_id` (nullable, unique)
- `password_hash` (`hashed_password`)
- `role` (`owner | admin`)
- `is_active`
- `is_verified`
- `created_at`, `updated_at`

Ограничения:
- хотя бы одно из `username` или `phone` должно быть заполнено
- уникальные `username`, `phone`

### Таблицы кодов

- `login_verification_codes`
  - `user_id`, `code_hash`, `expires_at`, `attempts`, `consumed_at`, `created_at`
- `telegram_pending_links`
  - `user_id`, `start_token`, `expires_at`, `used_at`, `created_at`

## Поток авторизации

### A) Owner добавляет админа

- `POST /owner/admins` (owner only)
- owner передаёт `username` и/или `phone`, `password`, опциональные поля
- создаётся `admin` с `is_verified=false`

### B) Вход админа (login + password + Telegram)

1. `POST /auth/login-request`
   - input: `login`, `password`
   - backend проверяет пользователя/пароль/роль/активность
   - генерирует `start_token` + создаёт `telegram_link`
2. Пользователь открывает бота: `https://t.me/<bot>?start=<token>`
3. Бот вызывает `POST /auth/telegram/start`
   - передаёт `start_token`, `chat_id`, `telegram_username`
   - backend привязывает chat и создаёт 6-значный код входа
4. Пользователь вводит код в CRM:
   - `POST /auth/login-verify` (`login`, `verification_code`)
   - backend проверяет hash/TTL/attempts, помечает `is_verified=true`, выдаёт JWT

## API минимум

- `POST /auth/login-request`
- `POST /auth/telegram/start`
- `POST /auth/login-verify`
- `GET /auth/me`
- `POST /owner/admins`
- `GET /owner/admins`
- `PATCH /owner/admins/{id}`

## Безопасность (обязательное)

- пароли только в bcrypt hash
- коды только в hash
- код 6 цифр, TTL 5–10 минут
- ограничение попыток кода
- `start_token` одноразовый + TTL
- нейтральные ошибки на login
- короткоживущий JWT

