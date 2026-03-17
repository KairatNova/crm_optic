# Backend (MVP)

## Запуск Postgres

Из корня репозитория:

```bash
docker compose --env-file .env.example up -d
```

## Запуск API

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\pip install -U pip
.venv\\Scripts\\pip install -r requirements.txt
.venv\\Scripts\\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверка:
- `GET /health`

