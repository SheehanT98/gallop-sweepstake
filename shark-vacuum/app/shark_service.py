"""Async wrapper around sharkiq for Megalodon / Matrix vacuums."""

from __future__ import annotations

import asyncio
import json
import enum
import logging
from datetime import datetime, timezone
from typing import Any, Callable, TypeVar

import aiohttp

from sharkiq import get_ayla_api
from sharkiq.exc import SharkIqAuthError, SharkIqNotAuthedError
from sharkiq.sharkiq import OperatingModes, Properties, SharkIqVacuum

from .config import Settings
from .map_decode import (
    DecodedMap,
    decode_map_bytes,
    parse_room_overlay,
    parse_zone_overlay,
)

_LOGGER = logging.getLogger(__name__)
T = TypeVar("T")

OPERATING_LABELS: dict[int, str] = {
    0: "stopped",
    1: "paused",
    2: "cleaning",
    3: "returning",
    4: "exploring",
    7: "mopping",
    8: "vacuum_and_mop",
}

CLEAN_AREA_PROPERTIES = (
    "Areas_To_Clean",
    "AreasToClean_V2",
    "AreasToClean_V3",
)


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
        self._vacuums: list[SharkIqVacuum] = []
        self._lock = asyncio.Lock()
        self.connection_error: str | None = None
        self.last_success_at: str | None = None
        self.app_version = "1.1.0"

    @property
    def is_connected(self) -> bool:
        return self._vacuum is not None and self.connection_error is None

    async def connect(self) -> None:
        self._settings.validate()
        self.connection_error = None
        if self._session and not self._session.closed:
            await self._session.close()
        self._session = aiohttp.ClientSession()
        self._api = get_ayla_api(
            self._settings.email,
            self._settings.password,
            websession=self._session,
            europe=self._settings.europe,
        )
        await self._api.async_sign_in()
        self._vacuums = await self._api.async_get_devices(update=False)
        if not self._vacuums:
            raise RuntimeError("No Shark robots on this account.")
        await self._select_vacuum(self._settings.device_dsn)
        self._touch_success()

    async def _select_vacuum(self, dsn: str | None) -> None:
        if not self._vacuums:
            raise RuntimeError("No vacuums loaded")
        vacuum: SharkIqVacuum | None = None
        if dsn:
            for candidate in self._vacuums:
                if candidate.serial_number == dsn:
                    vacuum = candidate
                    break
            if vacuum is None:
                available = [v.serial_number for v in self._vacuums]
                raise RuntimeError(
                    f"DSN {dsn!r} not found. Available: {available}"
                )
        else:
            vacuum = self._vacuums[0]
        self._vacuum = vacuum
        await self._vacuum.async_update()
        await self._vacuum.async_get_metadata()
        _LOGGER.info("Connected to %s (%s)", vacuum.name, vacuum.oem_model_number)

    async def reconnect(self) -> None:
        await self.connect()

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
        self._vacuum = None
        self._vacuums = []

    @property
    def vacuum(self) -> SharkIqVacuum:
        if self._vacuum is None:
            raise RuntimeError("Not connected to Shark cloud")
        return self._vacuum

    def _touch_success(self) -> None:
        self.last_success_at = datetime.now(timezone.utc).isoformat()
        self.connection_error = None

    async def _ensure_auth(self) -> None:
        if self._api is None:
            raise SharkIqNotAuthedError("API not initialized")
        if getattr(self._api, "token_expired", lambda: False)():
            _LOGGER.info("Token expired; re-authenticating")
            await self._api.async_sign_in()

    async def _run(self, fn: Callable[[], Any]) -> Any:
        """Run cloud call with auth retry once."""
        await self._ensure_auth()
        try:
            if asyncio.iscoroutinefunction(fn):
                result = await fn()
            else:
                result = fn()
            self._touch_success()
            return result
        except (SharkIqAuthError, SharkIqNotAuthedError):
            _LOGGER.warning("Auth error, retrying sign-in")
            await self._api.async_sign_in()
            if asyncio.iscoroutinefunction(fn):
                result = await fn()
            else:
                result = fn()
            self._touch_success()
            return result

    def list_devices(self) -> list[dict[str, Any]]:
        return [
            {
                "name": v.name,
                "dsn": v.serial_number,
                "oem_model": v.oem_model_number,
                "selected": self._vacuum is not None
                and v.serial_number == self._vacuum.serial_number,
            }
            for v in self._vacuums
        ]

    async def select_device(self, dsn: str) -> None:
        async with self._lock:
            await self._select_vacuum(dsn)

    def connection_info(self) -> dict[str, Any]:
        return {
            "connected": self.is_connected,
            "error": self.connection_error,
            "last_success_at": self.last_success_at,
            "app_version": self.app_version,
            "cloud_only": True,
            "region": "europe" if self._settings.europe else "us",
            "device_count": len(self._vacuums),
        }

    def _safe_get(self, prop: Properties | str, default: Any = None) -> Any:
        try:
            return self.vacuum.get_property_value(prop)
        except (KeyError, TypeError, ValueError):
            return default

    async def get_status(self) -> dict[str, Any]:
        async def _fetch() -> dict[str, Any]:
            async with self._lock:
                await self.vacuum.async_update()
            return self._build_status()

        return await self._run(_fetch)

    def _build_status(self) -> dict[str, Any]:
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

        if charging:
            headline = "Charging"
        elif docked and state == "stopped":
            headline = "Ready to vacuum"
        elif state == "cleaning":
            headline = "Vacuuming"
        elif state == "mopping":
            headline = "Mopping"
        elif state == "vacuum_and_mop":
            headline = "Vacuuming and mopping"
        elif state == "returning":
            headline = "Returning to dock"
        elif state == "paused":
            headline = "Paused"
        else:
            headline = state.replace("_", " ").title()

        rooms = self.get_rooms()
        return {
            "device_name": self.vacuum.name,
            "oem_model": self.vacuum.oem_model_number,
            "vac_model": self.vacuum.vac_model_number,
            "dsn": self.vacuum.serial_number,
            "operating_mode": mode_int,
            "state": state,
            "headline": headline,
            "ready": state in ("stopped", "paused") and not error_code,
            "battery_percent": battery,
            "docked": bool(docked),
            "charging": bool(charging),
            "power_mode": power,
            "error_code": error_code,
            "error_text": self.vacuum.error_text,
            "rooms": rooms,
            "default_floor": self._get_default_floor(),
            "action_hint": self._action_hint(state, rooms),
        }

    def _action_hint(self, state: str, rooms: list[str]) -> str:
        if state == "cleaning":
            return "Tap to pause"
        if state == "returning":
            return "Tap to stop return"
        if state == "paused":
            return "Tap to resume"
        if state == "mopping":
            return "Tap to pause"
        return "Whole-home clean"

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

    async def _encode_rooms_payload(self, rooms: list[str]) -> str:
        return self.vacuum._encode_room_list(rooms)  # noqa: SLF001

    async def start_clean(self, rooms: list[str] | None = None) -> dict[str, Any]:
        async def _do() -> dict[str, Any]:
            async with self._lock:
                if not rooms:
                    await self.vacuum.async_set_operating_mode(OperatingModes.START)
                    return {"method": "operating_mode_start"}

                try:
                    await self.vacuum.async_clean_rooms(rooms)
                    return {"method": "clean_rooms"}
                except Exception as primary:  # noqa: BLE001
                    payload = await self._encode_rooms_payload(rooms)
                    last_exc: Exception = primary
                    for prop in CLEAN_AREA_PROPERTIES:
                        if prop not in self.vacuum.properties_full:
                            continue
                        try:
                            await self.vacuum.async_set_property_value(prop, payload)
                            await self.vacuum.async_set_operating_mode(
                                OperatingModes.START
                            )
                            return {"method": prop}
                        except Exception as exc:  # noqa: BLE001
                            last_exc = exc
                    raise last_exc

        return await self._run(_do)

    async def pause(self) -> None:
        async def _do() -> None:
            async with self._lock:
                try:
                    await self.vacuum.async_set_operating_mode(OperatingModes.PAUSE)
                except Exception:  # noqa: BLE001
                    await self.vacuum.async_set_operating_mode(OperatingModes.STOP)

        await self._run(_do)

    async def stop(self) -> None:
        async def _do() -> None:
            async with self._lock:
                await self.vacuum.async_set_operating_mode(OperatingModes.STOP)

        await self._run(_do)

    async def dock(self) -> None:
        async def _do() -> None:
            async with self._lock:
                await self.vacuum.async_set_operating_mode(OperatingModes.RETURN)

        await self._run(_do)

    async def find(self) -> None:
        async def _do() -> None:
            async with self._lock:
                await self.vacuum.async_find_device()

        await self._run(_do)

    async def set_power_mode(self, mode: str) -> None:
        async def _do() -> None:
            async with self._lock:
                await self.vacuum.async_set_property_value(Properties.POWER_MODE, mode)

        await self._run(_do)

    async def set_default_floor(self, floor: int) -> None:
        floor = max(1, min(3, floor))

        async def _do() -> None:
            async with self._lock:
                await self.vacuum.async_set_property_value("Default_Floor", floor)

        await self._run(_do)

    async def spot_clean(self) -> dict[str, Any]:
        async def _do() -> dict[str, Any]:
            async with self._lock:
                used = []
                if "SpecialCleanMode" in self.vacuum.properties_full:
                    await self.vacuum.async_set_property_value("SpecialCleanMode", 1)
                    used.append("SpecialCleanMode")
                await self.vacuum.async_set_operating_mode(OperatingModes.START)
                return {"method": used or ["operating_mode_start"]}

        return await self._run(_do)

    async def _fetch_property_bytes(self, prop: str) -> bytes | None:
        try:
            async with self._lock:
                return await self.vacuum.async_get_file_property(prop)
        except Exception as exc:  # noqa: BLE001
            _LOGGER.debug("File property %s failed: %s", prop, exc)
            return None

    async def fetch_map_bytes(self, floor: int | None = None) -> tuple[bytes, str]:
        floor = floor or self._get_default_floor()
        last_exc: Exception | None = None

        for prop in (
            f"Visual_Floor_{floor}",
            f"Persistent_Floor_{floor}",
            f"Visual_Floor_{floor}".replace("_", ""),
        ):
            raw = await self._fetch_property_bytes(prop)
            if not raw:
                continue
            decoded = decode_map_bytes(raw)
            if decoded:
                return decoded.data, decoded.mime
            last_exc = RuntimeError(f"{prop}: not a known image ({len(raw)} bytes)")

        raise RuntimeError(f"No map image for floor {floor}") from last_exc

    async def get_map_bundle(self, floor: int | None = None) -> dict[str, Any]:
        floor = floor or self._get_default_floor()
        bundle: dict[str, Any] = {
            "floor": floor,
            "has_image": False,
            "mime": None,
            "decode_source": None,
            "rooms_overlay": [],
            "zones_overlay": [],
        }

        try:
            data, mime = await self.fetch_map_bytes(floor)
            bundle["has_image"] = True
            bundle["mime"] = mime
            bundle["bytes"] = len(data)
        except Exception as exc:  # noqa: BLE001
            bundle["error"] = str(exc)

        for prop in ("Mobile_App_Room_Definition", "Room_Definition"):
            raw = await self._fetch_property_bytes(prop)
            if raw:
                parsed = parse_room_overlay(raw)
                if parsed:
                    bundle["rooms_overlay"] = parsed
                    bundle["rooms_overlay_source"] = prop
                    break

        zones_raw = await self._fetch_property_bytes("Zones")
        if zones_raw:
            bundle["zones_overlay"] = parse_zone_overlay(zones_raw)

        if not bundle["rooms_overlay"]:
            bundle["rooms_overlay"] = [
                {"name": n, "x": None, "y": None} for n in self.get_rooms()
            ]

        return bundle

    async def get_map_info(self, floor: int | None = None) -> dict[str, Any]:
        return await self.get_map_bundle(floor)

    async def get_zones_meta(self) -> dict[str, Any] | None:
        raw = await self._fetch_property_bytes("Zones")
        if not raw:
            return None
        text = raw.decode("utf-8", errors="replace")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw_size": len(raw)}

