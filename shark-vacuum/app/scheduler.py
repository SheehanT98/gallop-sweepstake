"""Local schedule runner (cron-style, stored in data/schedules.json)."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from .store import Store

_LOGGER = logging.getLogger(__name__)

# Monday=0 … Sunday=6 (matches Python weekday())
DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class ScheduleRunner:
    def __init__(self, store: Store, timezone: str) -> None:
        self._store = store
        self._tz = ZoneInfo(timezone)

    def _now(self) -> datetime:
        return datetime.now(self._tz)

    def _already_ran_today(self, schedule_id: str) -> bool:
        last = self._store.schedule_last_run(schedule_id)
        if not last:
            return False
        try:
            last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=ZoneInfo("UTC"))
            return last_dt.astimezone(self._tz).date() == self._now().date()
        except ValueError:
            return False

    def due_schedules(self) -> list[dict[str, Any]]:
        now = self._now()
        due: list[dict[str, Any]] = []
        for sched in self._store.list_schedules():
            if not sched.get("enabled", True):
                continue
            days = sched.get("days")
            if days is not None and now.weekday() not in days:
                continue
            time_str = sched.get("time", "")
            try:
                hour, minute = map(int, time_str.split(":")[:2])
            except (ValueError, AttributeError):
                continue
            if now.hour != hour or now.minute != minute:
                continue
            sid = sched.get("id", "")
            if sid and self._already_ran_today(sid):
                continue
            due.append(sched)
        return due

    async def run_due(self, shark: Any, notifier: Any) -> int:
        """Execute due schedules. `shark` is SharkService."""
        count = 0
        for sched in self.due_schedules():
            sid = sched.get("id", "")
            name = sched.get("name", "Scheduled clean")
            rooms = sched.get("rooms") or None
            try:
                await shark.start_clean(rooms)
                self._store.mark_schedule_run(sid)
                room_txt = ", ".join(rooms) if rooms else "whole home"
                await notifier.send(
                    "Schedule started",
                    f"{name}: {room_txt}",
                    {"type": "schedule", "schedule_id": sid},
                )
                count += 1
                _LOGGER.info("Ran schedule %s (%s)", name, room_txt)
            except Exception as exc:  # noqa: BLE001
                _LOGGER.error("Schedule %s failed: %s", name, exc)
                await notifier.send(
                    "Schedule failed",
                    f"{name}: {exc}",
                    {"type": "schedule_error", "schedule_id": sid},
                )
        return count
