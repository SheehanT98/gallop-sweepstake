"""Async wrapper around sharkiq for the Megalodon / Matrix vacuums."""

from __future__ import annotations

import asyncio
import enum
import gzip
import json
import logging
from typing import Any

import aiohttp

from sharkiq import get_ayla_api
from sharkiq.sharkiq import OperatingModes, Properties, SharkIqVacuum

from .config import Settings

_LOGGER = logging.getLogger(__name__)

OPERATING_LABELS: dict[int, str] = {
    0: "stopped",
    1: "paused",
    2: "cleaning",
    3: "returning",
    4: "exploring",
    7: "mopping",
    8: "vacuum_and_mop",
}


class PowerMode(str, enum.Enum):
    ECO = "Eco"
    NORMAL = "Normal"
    MAX = "Max"


class SharkService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._session: aiohttp.ClientSession | None = None
        self._api = None
        self._vacuum: SharkIqVacuum | None = None
        self._lock = asyncio.Lock()

    async def connect(self) -> None:
        self._settings.validate()
        self._session = aiohttp.ClientSession()
        self._api = get_ayla_api(
            self._settings.email,
            self._settings.password,
            websession=self._session,
            europe=self._settings.europe,
        )
        await self._api.async_sign_in()
        vacuums = await self._api.async_get_devices(update=False)
        if not vacuums:
            raise RuntimeError("No Shark robots on this account.")

        vacuum: SharkIqVacuum | None = None
        if self._settings.device_dsn:
            for candidate in vacuums:
                if candidate.serial_number == self._settings.device_dsn:
                    vacuum = candidate
                    break
            if vacuum is None:
                available = [v.serial_number for v in vacuums]
                raise RuntimeError(
                    f"DSN {self._settings.device_dsn!r} not found. Available: {available}"
                )
        else:
            vacuum = vacuums[0]

        self._vacuum = vacuum
        await self._vacuum.async_update()
        await self._vacuum.async_get_metadata()
        _LOGGER.info(
            "Connected to %s (%s)",
            vacuum.name,
            vacuum.oem_model_number,
        )

    async def close(self) -> None:
        if self._api:
            try:
                await self._api.async_sign_out()
            except Exception:  # noqa: BLE001
                pass
            try:
                await self._api.async_close_session()
            except Exception:  # noqa: BLE001
                pass
        if self._session and not self._session.closed:
            await self._session.close()

    @property
    def vacuum(self) -> SharkIqVacuum:
        if self._vacuum is None:
            raise RuntimeError("Not connected")
        return self._vacuum

    async def refresh(self) -> None:
        async with self._lock:
            await self.vacuum.async_update()

    def _safe_get(self, prop: Properties | str, default: Any = None) -> Any:
        try:
            return self.vacuum.get_property_value(prop)
        except (KeyError, TypeError, ValueError):
            return default

    async def get_status(self) -> dict[str, Any]:
        async with self._lock:
            await self.vacuum.async_update()

        mode_raw = self._safe_get(Properties.OPERATING_MODE, 0)
        try:
            mode_int = int(mode_raw)
        except (TypeError, ValueError):
            mode_int = 0

        battery = self._safe_get(Properties.BATTERY_CAPACITY)
        docked = self._safe_get(Properties.DOCKED_STATUS)
        charging = self._safe_get(Properties.CHARGING_STATUS)
        error_code = self._safe_get(Properties.ERROR_CODE)
        power = self._safe_get(Properties.POWER_MODE)

        state = OPERATING_LABELS.get(mode_int, "unknown")
        ready = state in ("stopped", "paused") and not error_code

        if charging:
            headline = "Charging"
        elif docked and state == "stopped":
            headline = "Ready to vacuum"
        elif state == "cleaning":
            headline = "Vacuuming"
        elif state == "returning":
            headline = "Returning to dock"
        elif state == "paused":
            headline = "Paused"
        else:
            headline = state.replace("_", " ").title()

        return {
            "device_name": self.vacuum.name,
            "oem_model": self.vacuum.oem_model_number,
            "vac_model": self.vacuum.vac_model_number,
            "dsn": self.vacuum.serial_number,
            "operating_mode": mode_int,
            "state": state,
            "headline": headline,
            "ready": ready,
            "battery_percent": battery,
            "docked": bool(docked),
            "charging": bool(charging),
            "power_mode": power,
            "error_code": error_code,
            "error_text": self.vacuum.error_text,
            "rooms": self.get_rooms(),
            "default_floor": self._get_default_floor(),
        }

    def get_rooms(self) -> list[str]:
        try:
            return self.vacuum.get_room_list()
        except Exception:  # noqa: BLE001
            raw = self._safe_get(Properties.ROBOT_ROOM_LIST, "")
            if isinstance(raw, str) and ":" in raw:
                return raw.split(":")[1:]
            return []

    def _get_default_floor(self) -> int:
        val = self._safe_get("Default_Floor", 1)
        try:
            floor = int(val)
        except (TypeError, ValueError):
            floor = 1
        return max(1, min(3, floor))

    async def start_clean(self, rooms: list[str] | None = None) -> None:
        async with self._lock:
            if rooms:
                await self.vacuum.async_clean_rooms(rooms)
            else:
                await self.vacuum.async_set_operating_mode(OperatingModes.START)

    async def pause(self) -> None:
        async with self._lock:
            try:
                await self.vacuum.async_set_operating_mode(OperatingModes.PAUSE)
            except Exception:  # noqa: BLE001
                await self.vacuum.async_set_operating_mode(OperatingModes.STOP)

    async def stop(self) -> None:
        async with self._lock:
            await self.vacuum.async_set_operating_mode(OperatingModes.STOP)

    async def dock(self) -> None:
        async with self._lock:
            await self.vacuum.async_set_operating_mode(OperatingModes.RETURN)

    async def find(self) -> None:
        async with self._lock:
            await self.vacuum.async_find_device()

    async def set_power_mode(self, mode: str) -> None:
        async with self._lock:
            await self.vacuum.async_set_property_value(Properties.POWER_MODE, mode)

    async def set_default_floor(self, floor: int) -> None:
        floor = max(1, min(3, floor))
        async with self._lock:
            await self.vacuum.async_set_property_value("Default_Floor", floor)

    async def spot_clean(self) -> None:
        """Best-effort spot clean via special mode flag."""
        async with self._lock:
            if "SpecialCleanMode" in self.vacuum.properties_full:
                await self.vacuum.async_set_property_value("SpecialCleanMode", 1)
            await self.vacuum.async_set_operating_mode(OperatingModes.START)

    async def fetch_map_bytes(self, floor: int | None = None) -> tuple[bytes, str]:
        floor = floor or self._get_default_floor()
        prop = f"Visual_Floor_{floor}"
        async with self._lock:
            data = await self.vacuum.async_get_file_property(prop)
        mime = _detect_image_mime(data)
        if mime:
            return data, mime
        decompressed = _try_gunzip(data)
        if decompressed:
            mime = _detect_image_mime(decompressed)
            if mime:
                return decompressed, mime
            data = decompressed
        return data, "application/octet-stream"

    async def get_map_info(self) -> dict[str, Any]:
        floor = self._get_default_floor()
        try:
            raw, mime = await self.fetch_map_bytes(floor)
            return {
                "floor": floor,
                "mime": mime,
                "bytes": len(raw),
                "has_image": mime.startswith("image/"),
            }
        except Exception as exc:  # noqa: BLE001
            return {"floor": floor, "error": str(exc), "has_image": False}

    async def get_zones_meta(self) -> dict[str, Any] | None:
        try:
            async with self._lock:
                raw = await self.vacuum.async_get_file_property("Zones")
            if not raw:
                return None
            text = raw.decode("utf-8", errors="replace")
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"raw_size": len(raw), "preview": text[:500]}
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("Zones read failed: %s", exc)
            return None


def _detect_image_mime(data: bytes) -> str | None:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


def _try_gunzip(data: bytes) -> bytes | None:
    if data[:2] != b"\x1f\x8b":
        return None
    try:
        return gzip.decompress(data)
    except OSError:
        return None
