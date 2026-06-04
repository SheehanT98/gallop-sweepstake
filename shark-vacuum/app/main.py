"""Shark Megalodon local web controller."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .background import BackgroundWorker
from .config import ROOT, settings
from .history_service import HistorySync
from .shark_service import PowerMode, SharkService
from .store import Store

logging.basicConfig(level=logging.INFO)
_LOGGER = logging.getLogger(__name__)

WEB_DIR = ROOT / "web"
shark = SharkService(settings)
store = Store()
background = BackgroundWorker(shark, store, settings)
history_sync = HistorySync(store)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    url = settings.phone_url()
    if settings.lan_mode:
        _LOGGER.info("LAN mode: phone URL %s", url or "(could not detect IP)")
    try:
        await shark.connect()
        await background.start()
    except Exception as exc:  # noqa: BLE001
        shark.connection_error = str(exc)
        _LOGGER.warning(
            "Shark cloud login failed at startup (setup UI available): %s", exc
        )
    yield
    await background.stop()
    await shark.close()


app = FastAPI(
    title="Shark Home",
    description="Local controller for Shark Matrix / Megalodon vacuums",
    version="1.2.0",
    lifespan=lifespan,
)


def require_connected() -> SharkService:
    if not shark.is_connected:
        raise HTTPException(
            status_code=503,
            detail={
                "message": shark.connection_error or "Not connected to Shark cloud",
                "setup_url": "/setup",
                "cloud_only": True,
            },
        )
    return shark


class CleanRequest(BaseModel):
    rooms: list[str] | None = Field(default=None)


class PowerModeRequest(BaseModel):
    mode: str


class FloorRequest(BaseModel):
    floor: int = Field(ge=1, le=3)


class SelectDeviceRequest(BaseModel):
    dsn: str


class ScheduleBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    time: str = Field(description="HH:MM 24h in your timezone")
    days: list[int] = Field(
        default=[0, 1, 2, 3, 4, 5, 6],
        description="Weekdays 0=Mon … 6=Sun",
    )
    rooms: list[str] | None = None
    enabled: bool = True


class ScheduleUpdate(ScheduleBody):
    id: str


@app.get("/api/features")
async def features():
    """Capability flags for UI and future Vercel split."""
    return {
        "version": shark.app_version,
        "schedules": True,
        "history": True,
        "notifications": settings.notifications_configured(),
        "live_position": True,
        "deployment": "local",
        "vercel_note": (
            "Schedules, notifications, and live polling require a long-running "
            "worker. On Vercel use a separate cron/worker service + hosted DB."
        ),
        "timezone": settings.timezone,
    }


@app.get("/api/mobile-url")
async def mobile_url():
    return {
        "lan_mode": settings.lan_mode,
        "url": settings.phone_url(),
        "port": settings.port,
        "note": "Phone must be on the same Wi-Fi. Host must stay running.",
    }


@app.get("/api/health")
async def health():
    return {
        "ok": True,
        **shark.connection_info(),
        "notifications": settings.notifications_configured(),
        "timezone": settings.timezone,
    }


@app.get("/api/connection")
async def connection():
    return shark.connection_info()


@app.post("/api/reconnect")
async def reconnect():
    try:
        await shark.reconnect()
        await background.start()
        return shark.connection_info()
    except Exception as exc:  # noqa: BLE001
        shark.connection_error = str(exc)
        raise HTTPException(503, str(exc)) from exc


@app.get("/api/devices")
async def devices():
    if not shark._vacuums and not shark.is_connected:
        raise HTTPException(503, shark.connection_error or "Not connected")
    return {"devices": shark.list_devices()}


@app.post("/api/devices/select")
async def select_device(
    body: SelectDeviceRequest,
    svc: Annotated[SharkService, Depends(require_connected)],
):
    await svc.select_device(body.dsn)
    return {"ok": True, "dsn": body.dsn}


@app.get("/api/status")
async def status(svc: Annotated[SharkService, Depends(require_connected)]):
    try:
        data = await svc.get_status()
        data.update(svc.connection_info())
        pos = store.get_robot_position()
        if pos:
            data["robot_position"] = pos
        return data
    except Exception as exc:  # noqa: BLE001
        shark.connection_error = str(exc)
        raise HTTPException(502, str(exc)) from exc


@app.get("/api/map/position")
async def map_position(svc: Annotated[SharkService, Depends(require_connected)]):
    pos = store.get_robot_position()
    if pos and pos.get("available"):
        return pos
    pos = await svc.get_robot_position()
    if pos:
        store.set_robot_position(pos)
    return pos or {"available": False}


@app.get("/api/rooms")
async def rooms(svc: Annotated[SharkService, Depends(require_connected)]):
    return {"rooms": svc.get_rooms()}


@app.post("/api/clean")
async def clean(
    body: CleanRequest, svc: Annotated[SharkService, Depends(require_connected)]
):
    try:
        meta = await svc.start_clean(body.rooms or None)
        return {"ok": True, "rooms": body.rooms, **meta}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/pause")
async def pause(svc: Annotated[SharkService, Depends(require_connected)]):
    await svc.pause()
    return {"ok": True}


@app.post("/api/stop")
async def stop(svc: Annotated[SharkService, Depends(require_connected)]):
    await svc.stop()
    return {"ok": True}


@app.post("/api/dock")
async def dock(svc: Annotated[SharkService, Depends(require_connected)]):
    await svc.dock()
    return {"ok": True}


@app.post("/api/find")
async def find_robot(svc: Annotated[SharkService, Depends(require_connected)]):
    await svc.find()
    return {"ok": True}


@app.post("/api/spot")
async def spot(svc: Annotated[SharkService, Depends(require_connected)]):
    meta = await svc.spot_clean()
    return {"ok": True, **meta}


@app.post("/api/power-mode")
async def power_mode(
    body: PowerModeRequest, svc: Annotated[SharkService, Depends(require_connected)]
):
    allowed = {m.value for m in PowerMode}
    if body.mode not in allowed:
        raise HTTPException(400, f"mode must be one of {sorted(allowed)}")
    await svc.set_power_mode(body.mode)
    return {"ok": True, "mode": body.mode}


@app.post("/api/floor")
async def set_floor(
    body: FloorRequest, svc: Annotated[SharkService, Depends(require_connected)]
):
    await svc.set_default_floor(body.floor)
    return {"ok": True, "floor": body.floor}


@app.get("/api/map/info")
async def map_info(
    svc: Annotated[SharkService, Depends(require_connected)],
    floor: int | None = Query(default=None, ge=1, le=3),
):
    return await svc.get_map_bundle(floor)


@app.get("/api/map/image")
async def map_image(
    svc: Annotated[SharkService, Depends(require_connected)],
    floor: int | None = Query(default=None, ge=1, le=3),
):
    try:
        data, mime = await svc.fetch_map_bytes(floor)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(404, str(exc)) from exc
    return Response(content=data, media_type=mime)


@app.get("/api/zones")
async def zones(svc: Annotated[SharkService, Depends(require_connected)]):
    return {"zones": await svc.get_zones_meta()}


# --- Schedules ---


@app.get("/api/schedules")
async def list_schedules():
    return {
        "schedules": store.list_schedules(),
        "timezone": settings.timezone,
        "day_labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    }


@app.post("/api/schedules")
async def create_schedule(body: ScheduleBody):
    if not all(0 <= d <= 6 for d in body.days):
        raise HTTPException(400, "days must be 0-6 (Mon-Sun)")
    parts = body.time.split(":")
    if len(parts) != 2:
        raise HTTPException(400, "time must be HH:MM")
    item = store.save_schedule(body.model_dump())
    return {"ok": True, "schedule": item}


@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, body: ScheduleBody):
    item = store.save_schedule({**body.model_dump(), "id": schedule_id})
    return {"ok": True, "schedule": item}


@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    if not store.delete_schedule(schedule_id):
        raise HTTPException(404, "Schedule not found")
    return {"ok": True}


# --- History ---


@app.get("/api/history")
async def list_history(limit: int = Query(default=40, ge=1, le=200)):
    return {
        "runs": store.list_history(limit),
        "last_sync": store.last_history_sync(),
    }


@app.post("/api/history/sync")
async def sync_history(svc: Annotated[SharkService, Depends(require_connected)]):
    result = await history_sync.sync_from_shark(svc)
    return {"ok": True, **result}


# --- Notifications ---


@app.get("/api/notifications")
async def list_notifications(limit: int = Query(default=30, ge=1, le=100)):
    return {
        "configured": settings.notifications_configured(),
        "events": store.list_notifications(limit),
    }


@app.get("/setup")
async def setup_page():
    return FileResponse(WEB_DIR / "setup.html")


@app.get("/")
async def index():
    return FileResponse(WEB_DIR / "index.html")


app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


def run():
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )


if __name__ == "__main__":
    run()
