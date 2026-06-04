"""Parse and sync cleaning history from Shark cloud file properties."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from .store import Store

_LOGGER = logging.getLogger(__name__)


def _fingerprint(obj: dict[str, Any]) -> str:
    raw = json.dumps(obj, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _walk_runs(node: Any, found: list[dict[str, Any]]) -> None:
    if isinstance(node, dict):
        keys = {k.lower() for k in node}
        run_like = keys & {
            "duration",
            "runtime",
            "starttime",
            "start_time",
            "endtime",
            "end_time",
            "area",
            "squaremeters",
            "square_meters",
            "cleanedarea",
        }
        if run_like or ("date" in keys and len(node) <= 12):
            item = {k: v for k, v in node.items() if not isinstance(v, (dict, list))}
            if item:
                item["fingerprint"] = _fingerprint(item)
                found.append(item)
        for v in node.values():
            _walk_runs(v, found)
    elif isinstance(node, list):
        for item in node:
            _walk_runs(item, found)


def parse_cleaning_statistics(raw: bytes) -> list[dict[str, Any]]:
    text = None
    for encoding in ("utf-8", "latin-1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if not text:
        return []

    runs: list[dict[str, Any]] = []
    try:
        obj = json.loads(text)
        _walk_runs(obj, runs)
    except json.JSONDecodeError:
        # Line-based fallback
        for line in text.splitlines():
            line = line.strip()
            if not line or line[0] not in "{[":
                continue
            try:
                _walk_runs(json.loads(line), runs)
            except json.JSONDecodeError:
                continue

    # Dedupe by fingerprint
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for r in runs:
        fp = r.get("fingerprint")
        if fp and fp in seen:
            continue
        if fp:
            seen.add(fp)
        unique.append(r)
    return unique


class HistorySync:
    def __init__(self, store: Store) -> None:
        self._store = store

    async def sync_from_shark(self, shark: Any) -> dict[str, Any]:
        raw = await shark.fetch_cleaning_statistics_raw()
        if not raw:
            return {"added": 0, "message": "No statistics available"}
        runs = parse_cleaning_statistics(raw)
        added = self._store.append_history_runs(runs)
        self._store.set_last_history_sync()
        return {"added": added, "parsed": len(runs)}
