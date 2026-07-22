"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routes import categories, events, projects, reminders, summary, tags, upload
from app.services.notifier import check_and_fire_reminders

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB, start reminder scheduler. Shutdown: stop scheduler."""
    init_db()
    scheduler.add_job(check_and_fire_reminders, "interval", seconds=30, id="reminders")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="日程规划",
    description="Personal schedule planner with calendar, Gantt chart, and reminders",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware: prevent caching of static files so updates take effect immediately
@app.middleware("http")
async def no_cache_static(request: Request, call_next):
    response: Response = await call_next(request)
    path = request.url.path
    # Only affect static files, not API routes
    if not path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# API routes
app.include_router(events.router)
app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(projects.router)
app.include_router(reminders.router)
app.include_router(summary.router)
app.include_router(upload.router)

# Static files (frontend) — must be last to not shadow API routes
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
