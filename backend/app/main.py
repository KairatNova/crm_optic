from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import get_current_user
from app.api.routers.appointments import router as appointments_router
from app.api.routers.auth import router as auth_router
from app.api.routers.clients import router as clients_router
from app.api.routers.health import router as health_router
from app.api.routers.owner_admins import router as owner_admins_router
from app.api.routers.owner_export import router as owner_export_router
from app.api.routers.public_booking import router as public_booking_router
from app.api.routers.visits import router as visits_router
from app.api.routers.vision_tests import router as vision_tests_router
from app.api.routers.visit_and_vision import router as visit_and_vision_router
from app.core.config import get_settings

_crm_deps = [Depends(get_current_user)]


def create_app() -> FastAPI:
    app = FastAPI(title="CRM Optic API", version="0.1.0")
    settings = get_settings()
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["http://localhost:3000"],
        # Dev LAN support: allow localhost + private network hosts with any port.
        allow_origin_regex=(
            r"^https?://("
            r"localhost|127\.0\.0\.1|"
            r"192\.168\.\d{1,3}\.\d{1,3}|"
            r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
            r")(:\d+)?$"
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(public_booking_router)
    app.include_router(owner_admins_router)
    app.include_router(owner_export_router)
    app.include_router(clients_router, dependencies=_crm_deps)
    app.include_router(appointments_router, dependencies=_crm_deps)
    app.include_router(visits_router, dependencies=_crm_deps)
    app.include_router(vision_tests_router, dependencies=_crm_deps)
    app.include_router(visit_and_vision_router, dependencies=_crm_deps)
    return app


app = create_app()

