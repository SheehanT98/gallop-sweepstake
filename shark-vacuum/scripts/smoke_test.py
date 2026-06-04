#!/usr/bin/env python3
"""Smoke-test Shark Home while it is running on http://127.0.0.1:8765"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8765"


def req(method: str, path: str, body: dict | None = None) -> tuple[int, object]:
    url = BASE + path
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            raw = resp.read()
            ct = resp.headers.get("Content-Type", "")
            if "json" in ct:
                return resp.status, json.loads(raw.decode())
            return resp.status, f"<{len(raw)} bytes>"
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            detail = json.loads(raw)
        except json.JSONDecodeError:
            detail = raw[:500]
        return e.code, detail


def check(name: str, method: str, path: str, body: dict | None = None, ok_codes=(200,)) -> bool:
    code, data = req(method, path, body)
    ok = code in ok_codes
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name} -> HTTP {code}")
    if not ok or name in ("Status", "Features", "Map info", "Schedules", "History"):
        preview = json.dumps(data, default=str)[:200] if isinstance(data, (dict, list)) else str(data)[:200]
        print(f"         {preview}")
    return ok


def main() -> int:
    print(f"Shark Home smoke test -> {BASE}\n")
    results: list[bool] = []

    results.append(check("Health", "GET", "/api/health"))
    results.append(check("Features", "GET", "/api/features"))
    results.append(check("Connection", "GET", "/api/connection"))

    code, data = req("GET", "/api/health")
    connected = isinstance(data, dict) and data.get("connected")
    if not connected:
        print("\n  Robot not connected to cloud — control tests skipped.")
        print("  Fix .env / setup page, then re-run.\n")
        return 1

    results.append(check("Status", "GET", "/api/status"))
    results.append(check("Rooms", "GET", "/api/rooms"))
    results.append(check("Map info", "GET", "/api/map/info"))
    results.append(check("Map image", "GET", "/api/map/image"))
    results.append(check("Map position", "GET", "/api/map/position"))
    results.append(check("Schedules list", "GET", "/api/schedules"))
    results.append(check("History", "GET", "/api/history"))
    results.append(check("Notifications log", "GET", "/api/notifications"))
    results.append(check("Zones", "GET", "/api/zones"))

  # Non-destructive writes: only if --full passed
    if "--full" in sys.argv:
        print("\n  --full: testing write endpoints (may start/pause robot)\n")
        results.append(check("Find (beep)", "POST", "/api/find", {}))
    else:
        print("\n  Skipping POST actions (use --full to test find/pause/clean).\n")

    passed = sum(results)
    total = len(results)
    print(f"Result: {passed}/{total} passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
