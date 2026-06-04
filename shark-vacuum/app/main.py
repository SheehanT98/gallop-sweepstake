"""Shark Megalodon local web controller."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import ROOT, settings
from .shark_service import PowerMode, SharkService

logging.basicConfig(level=logging.INFO)
_LOGGER = logging.getLogger(__name__)

WEB_DIR = ROOT / "web"
shark = SharkService(settings)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await shark.connect()
    except Exception as exc:  # noqa: BLE001
        _LOGGER.error("Failed to connect to Shark cloud: %s", exc)
        raise
    yield
    await shark.close()


app = FastAPI(
    title="Shark Home",
    description="Local controller for Shark Matrix / Megalodon vacuums",
    version="1.0.0",
    lifespan=lifespan,
)


def require_shark() -> SharkService:
    return shark


class CleanRequest(BaseModel):
    rooms: list[str] | None = Field(
        default=None,
        description="Room names from the app; omit for whole-home clean",
    )


class PowerModeRequest(BaseModel):
    mode: str


class FloorRequest(BaseModel):
    floor: int = Field(ge=1, le=3)


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/status")
async def status(svc: Annotated[SharkService, Depends(require_shark)]):
    try:
        return await svc.get_status()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Status failed: {exc}") from exc


@app.get("/api/rooms")
async def rooms(svc: Annotated[SharkService, Depends(require_shark)]):
    return {"rooms": svc.get_rooms()}


@app.post("/api/clean")
async def clean(body: CleanRequest, svc: Annotated[SharkService, Depends(require_shark)]):
    try:
        await svc.start_clean(body.rooms or None)
        return {"ok": True, "rooms": body.rooms}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/pause")
async def pause(svc: Annotated[SharkService, Depends(require_shark)]):
    await svc.pause()
    return {"ok": True}


@app.post("/api/stop")
async def stop(svc: Annotated[SharkService, Depends(require_shark)]):
    await svc.stop()
    return {"ok": True}


@app.post("/api/dock")
async def dock(svc: Annotated[SharkService, Depends(require_shark)]):
    await svc.dock()
    return {"ok": True}


@app.post("/api/find")
async def find_robot(svc: Annotated[SharkService, Depends(require_shark)]):
    await svc.find()
    return {"ok": True}


@app.post("/api/spot")
async def spot(svc: Annotated[SharkService, Depends(require_shark)]):
    await svc.spot_clean()
    return {"ok": True}


@app.post("/api/power-mode")
async def power_mode(
    body: PowerModeRequest, svc: Annotated[SharkService, Depends(require_shark)]
):
    allowed = {m.value for m in PowerMode}
    if body.mode not in allowed:
        raise HTTPException(400, f"mode must be one of {sorted(allowed)}")
    await svc.set_power_mode(body.mode)
    return {"ok": True, "mode": body.mode}


@app.post("/api/floor")
async def set_floor(
    body: FloorRequest, svc: Annotated[SharkService, Depends(require_shark)]
):
    await svc.set_default_floor(body.floor)
    return {"ok": True, "floor": body.floor}


@app.get("/api/map/info")
async def map_info(svc: Annotated[SharkService, Depends(require_shark)]):
    return await svc.get_map_info()


@app.get("/api/map/image")
async def map_image(
    svc: Annotated[SharkService, Depends(require_shark)],
    floor: int | None = Query(default=None, ge=1, le=3),
):
    try:
        data, mime = await svc.fetch_map_bytes(floor)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(404, f"Map not available: {exc}") from exc
    if not mime.startswith("image/"):
        raise HTTPException(
            415,
            "Map format not yet decoded for display. Status and room cleaning still work.",
        )
    return Response(content=data, media_type=mime)


@app.get("/api/zones")
async def zones(svc: Annotated[SharkService, Depends(require_shark)]):
    data = await svc.get_zones_meta()
    return {"zones": data}


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
