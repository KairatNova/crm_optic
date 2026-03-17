from fastapi import FastAPI

from app.api.routers.appointments import router as appointments_router
from app.api.routers.clients import router as clients_router
from app.api.routers.health import router as health_router
from app.api.routers.visits import router as visits_router
from app.api.routers.vision_tests import router as vision_tests_router


def create_app() -> FastAPI:
    app = FastAPI(title="CRM Optic API", version="0.1.0")
    app.include_router(health_router)
    app.include_router(clients_router)
    app.include_router(appointments_router)
    app.include_router(visits_router)
    app.include_router(vision_tests_router)
    return app


app = create_app()

