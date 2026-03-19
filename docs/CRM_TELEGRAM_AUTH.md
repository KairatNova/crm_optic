# CRM Auth: owner + admins + Telegram code

Открытой регистрации нет. Вход только для пользователей, которых создаёт `owner`.

## Реализованный поток

### 1) Owner создаёт админа

- `POST /owner/admins` (только `owner`)
- owner передаёт `username` и/или `phone`, `password`, опционально `full_name`, `email`, `telegram_username`
- создаётся `role=admin`, `is_verified=false`

### 2) Шаг входа 1 — `login-request`

- `POST /auth/login-request`
- вход: `login` (`username` или `phone`) + `password`
- backend:
  - нормализует логин (`username` lower, `phone` в `+996...`)
  - проверяет пароль
  - создаёт одноразовый `start_token` с TTL
  - возвращает `telegram_link`: `https://t.me/<bot>?start=<token>`

### 3) Telegram bot `/start`

- бот получает `start_token` и вызывает:
  - `POST /auth/telegram/start`
  - body: `start_token`, `chat_id`, `telegram_username`
  - header (опционально): `X-Bot-Secret`
- backend:
  - валидирует токен и срок
  - привязывает `telegram_chat_id` к пользователю
  - генерирует 6-значный код входа (TTL 5-10 минут)
  - возвращает текст для отправки пользователю: `"Your login code: 123456..."`

### 4) Шаг входа 2 — `login-verify`

- `POST /auth/login-verify`
- вход: `login`, `verification_code`
- backend:
  - проверяет код (в БД хранится только хэш кода)
  - ограничивает число попыток
  - при успехе: `is_verified=true`, выдаёт JWT

### 5) Проверка текущего пользователя

- `GET /auth/me` — возвращает текущего пользователя по Bearer JWT

## Owner API

- `POST /owner/admins` — создать админа
- `GET /owner/admins` — список админов
- `PATCH /owner/admins/{id}` — активировать/деактивировать, сбросить пароль

## ENV переменные

- `JWT_SECRET`
- `JWT_EXPIRE_MINUTES`
- `VERIFICATION_CODE_TTL_MINUTES`
- `START_TOKEN_TTL_MINUTES`
- `VERIFICATION_MAX_ATTEMPTS`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_BOT_WEBHOOK_SECRET` (если хотите защищать endpoint бота)
- `CORS_ORIGINS`

## Безопасность (внедрено)

- Пароли: `bcrypt`
- Коды: хранятся как SHA-256 хэш
- `start_token`: одноразовый + TTL
- Ограничение попыток ввода кода
- JWT для CRM-эндпоинтов


