"""Background tasks: schedules, history sync, notifications, live position."""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from .history_service import HistorySync
from .notifications import Notifier
from .scheduler import ScheduleRunner

if TYPE_CHECKING:
    from .config import Settings
    from .shark_service import SharkService
    from .store import Store

_LOGGER = logging.getLogger(__name__)


class BackgroundWorker:
    def __init__(
        self,
        shark: "SharkService",
        store: "Store",
        settings: "Settings",
    ) -> None:
        self._shark = shark
        self._store = store
        self._settings = settings
        self._notifier = Notifier(settings, store)
        self._scheduler = ScheduleRunner(store, settings.timezone)
        self._history = HistorySync(store)
        self._task: asyncio.Task | None = None
        self._tick = 0

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._notifier.close()

    async def _loop(self) -> None:
        _LOGGER.info("Background worker started")
        while True:
            try:
                await self._tick_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                _LOGGER.exception("Background tick error: %s", exc)
            await asyncio.sleep(self._settings.background_interval_seconds)

    async def _tick_once(self) -> None:
        if not self._shark.is_connected:
            return

        self._tick += 1
        status = await self._shark.get_status()

        old_state = self._store.get_last_state()
        new_state = status.get("state", "unknown")
        if old_state != new_state:
            await self._notifier.on_state_change(old_state, status)
            self._store.set_last_state(new_state)

        # Live position (every tick when cleaning, else every 3rd tick)
        if new_state in ("cleaning", "mopping", "vacuum_and_mop", "exploring") or (
            self._tick % 3 == 0
        ):
            pos = await self._shark.get_robot_position()
            self._store.set_robot_position(pos)

        # Schedules — check every tick (~30s default)
        await self._scheduler.run_due(self._shark, self._notifier)

        # History — every ~5 min
        if self._tick % max(1, int(300 / self._settings.background_interval_seconds)) == 0:
            try:
                result = await self._history.sync_from_shark(self._shark)
                if result.get("added"):
                    _LOGGER.info("History sync: added %s runs", result["added"])
            except Exception as exc:  # noqa: BLE001
                _LOGGER.debug("History sync skipped: %s", exc)
