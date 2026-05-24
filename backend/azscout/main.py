from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from azscout.api.scans import router as scans_router
from azscout.api.stats import router as stats_router
from azscout.api.subscriptions import router as subscriptions_router
from azscout.config import settings
from azscout.db.models import Base
from azscout.db.session import engine
from azscout.logging_config import configure_logging
from azscout.scheduler import start_scheduler, stop_scheduler
from azscout.subscriptions.service import seed_subscriptions_from_env_if_empty


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="AzScout API")
    app.include_router(scans_router)
    app.include_router(stats_router)
    app.include_router(subscriptions_router)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        seed_subscriptions_from_env_if_empty()
        start_scheduler()

    @app.on_event("shutdown")
    def on_shutdown() -> None:
        stop_scheduler()

    # TODO: plug authentication/authorization here when moving beyond trusted-host MVP.
    return app


app = create_app()
