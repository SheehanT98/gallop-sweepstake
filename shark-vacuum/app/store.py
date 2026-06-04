"""Local JSON persistence (schedules, history, notification log).

Designed so a future Vercel deployment can swap this for KV/Postgres;
API routes should not depend on file paths directly.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import ROOT

DATA_DIR = ROOT / "data"
SCHEDULES_FILE = DATA_DIR / "schedules.json"
HISTORY_FILE = DATA_DIR / "history.json"
NOTIFY_LOG_FILE = DATA_DIR / "notification_log.json"
STATE_FILE = DATA_DIR / "runtime_state.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._ensure_file(SCHEDULES_FILE, {"schedules": []})
        self._ensure_file(HISTORY_FILE, {"runs": [], "snapshots": []})
        self._ensure_file(NOTIFY_LOG_FILE, {"events": []})
        self._ensure_file(
            STATE_FILE,
            {"last_state": None, "schedule_runs": {}, "last_history_sync": None},
        )

    @staticmethod
    def _ensure_file(path: Path, default: dict) -> None:
        if not path.exists():
            path.write_text(json.dumps(default, indent=2), encoding="utf-8")

    def _read(self, path: Path) -> dict:
        with self._lock:
            return json.loads(path.read_text(encoding="utf-8"))

    def _write(self, path: Path, data: dict) -> None:
        with self._lock:
            path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    # --- Schedules ---

    def list_schedules(self) -> list[dict[str, Any]]:
        return self._read(SCHEDULES_FILE).get("schedules", [])

    def save_schedule(self, item: dict[str, Any]) -> dict[str, Any]:
        data = self._read(SCHEDULES_FILE)
        schedules = data.get("schedules", [])
        if "id" not in item:
            item["id"] = str(uuid.uuid4())
        item.setdefault("enabled", True)
        item.setdefault("created_at", _utc_now())
        item["updated_at"] = _utc_now()
        found = False
        for i, s in enumerate(schedules):
            if s.get("id") == item["id"]:
                schedules[i] = {**s, **item}
                found = True
                break
        if not found:
            schedules.append(item)
        data["schedules"] = schedules
        self._write(SCHEDULES_FILE, data)
        return item

    def delete_schedule(self, schedule_id: str) -> bool:
        data = self._read(SCHEDULES_FILE)
        before = len(data.get("schedules", []))
        data["schedules"] = [
            s for s in data.get("schedules", []) if s.get("id") != schedule_id
        ]
        self._write(SCHEDULES_FILE, data)
        return len(data["schedules"]) < before

    def mark_schedule_run(self, schedule_id: str) -> None:
        state = self._read(STATE_FILE)
        runs = state.setdefault("schedule_runs", {})
        runs[schedule_id] = _utc_now()
        self._write(STATE_FILE, state)

    def schedule_last_run(self, schedule_id: str) -> str | None:
        return self._read(STATE_FILE).get("schedule_runs", {}).get(schedule_id)

    # --- History ---

    def list_history(self, limit: int = 50) -> list[dict[str, Any]]:
        runs = self._read(HISTORY_FILE).get("runs", [])
        return sorted(runs, key=lambda r: r.get("recorded_at", ""), reverse=True)[:limit]

    def append_history_runs(self, runs: list[dict[str, Any]]) -> int:
        if not runs:
            return 0
        data = self._read(HISTORY_FILE)
        existing = data.get("runs", [])
        seen = {r.get("fingerprint") for r in existing if r.get("fingerprint")}
        added = 0
        for run in runs:
            fp = run.get("fingerprint")
            if fp and fp in seen:
                continue
            run.setdefault("recorded_at", _utc_now())
            existing.append(run)
            if fp:
                seen.add(fp)
            added += 1
        data["runs"] = existing[-500:]
        self._write(HISTORY_FILE, data)
        return added

    def set_last_history_sync(self) -> None:
        state = self._read(STATE_FILE)
        state["last_history_sync"] = _utc_now()
        self._write(STATE_FILE, state)

    def last_history_sync(self) -> str | None:
        return self._read(STATE_FILE).get("last_history_sync")

    # --- Notifications log ---

    def log_notification(self, event: dict[str, Any]) -> None:
        data = self._read(NOTIFY_LOG_FILE)
        events = data.get("events", [])
        event.setdefault("at", _utc_now())
        events.insert(0, event)
        data["events"] = events[:200]
        self._write(NOTIFY_LOG_FILE, data)

    def list_notifications(self, limit: int = 30) -> list[dict[str, Any]]:
        return self._read(NOTIFY_LOG_FILE).get("events", [])[:limit]

    # --- Runtime (state transitions, robot position cache) ---

    def get_last_state(self) -> str | None:
        return self._read(STATE_FILE).get("last_state")

    def set_last_state(self, state: str) -> None:
        state_data = self._read(STATE_FILE)
        state_data["last_state"] = state
        self._write(STATE_FILE, state_data)

    def set_robot_position(self, pos: dict[str, Any] | None) -> None:
        state_data = self._read(STATE_FILE)
        state_data["robot_position"] = pos
        state_data["robot_position_at"] = _utc_now()
        self._write(STATE_FILE, state_data)

    def get_robot_position(self) -> dict[str, Any] | None:
        return self._read(STATE_FILE).get("robot_position")
