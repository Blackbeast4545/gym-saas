from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from app.core.config import settings
from app.database import engine, SessionLocal, Base
from app.models import models  # noqa
from app.services.seeder import seed_super_admin
from app.core.demo_guard import demo_guard_middleware
from app.routers import auth, super_admin, gym_admin, attendance, notifications, member_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"[STARTUP] {settings.APP_NAME} v{settings.APP_VERSION}")
    Base.metadata.create_all(bind=engine, checkfirst=True)
    logger.info("[STARTUP] Tables ready")
    db = SessionLocal()
    try:
        seed_super_admin(db)
    finally:
        db.close()
    yield
    logger.info("[SHUTDOWN]")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
    lifespan=lifespan,
)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")] if not settings.DEBUG else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["Authorization","Content-Type","Accept"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(round(time.time() - start, 4))
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

@app.middleware("http")
async def demo_guard(request: Request, call_next):
    return await demo_guard_middleware(request, call_next)

@app.exception_handler(Exception)
async def global_error(request: Request, exc: Exception):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

PREFIX = "/api/v1"
app.include_router(auth.router,          prefix=PREFIX)
app.include_router(super_admin.router,   prefix=PREFIX)
app.include_router(gym_admin.router,     prefix=PREFIX)
app.include_router(attendance.router,    prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(member_app.router,    prefix=PREFIX)

@app.get("/")
def root():
    return {"status": "ok", "app": settings.APP_NAME}

@app.get("/health")
def health():
    return {"status": "healthy"}
