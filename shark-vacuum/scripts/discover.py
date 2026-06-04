#!/usr/bin/env python3
"""
Probe a Shark robot via the unofficial Ayla/sharkiq API (SharkClean cloud).

Usage:
  cp .env.example .env   # fill in SHARK_EMAIL / SHARK_PASSWORD
  pip install -r requirements.txt
  python scripts/discover.py

Writes a JSON report to reports/discovery-<timestamp>.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiohttp
from dotenv import load_dotenv

from sharkiq import get_ayla_api
from sharkiq.sharkiq import OperatingModes, Properties, SharkIqVacuum

ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = ROOT / "reports"


def _redact(value: str | None, keep: int = 4) -> str | None:
    if not value:
        return value
    if len(value) <= keep * 2:
        return "***"
    return f"{value[:keep]}…{value[-keep:]}"


def _summarize_property(name: str, meta: dict[str, Any], current_value: Any) -> dict[str, Any]:
    return {
        "name": name,
        "base_type": meta.get("base_type"),
        "direction": meta.get("direction"),
        "read_only": meta.get("read_only"),
        "value": current_value,
        "display_name": meta.get("display_name"),
        "key": meta.get("key"),
    }


async def _probe_file_property(
    session: aiohttp.ClientSession, vacuum: SharkIqVacuum, name: str
) -> dict[str, Any]:
    out: dict[str, Any] = {"name": name}
    try:
        url = await vacuum.async_get_file_property_url(name)
    except (KeyError, ValueError) as exc:
        out["error"] = str(exc)
        return out

    if not url:
        out["note"] = "no file URL"
        return out

    out["url_host"] = url.split("/")[2] if "/" in url else url
    try:
        async with session.head(url, allow_redirects=True) as resp:
            out["http_status"] = resp.status
            out["content_type"] = resp.headers.get("Content-Type")
            cl = resp.headers.get("Content-Length")
            if cl:
                out["content_length"] = int(cl)
    except Exception as exc:  # noqa: BLE001
        out["head_error"] = str(exc)

    # Small maps/metadata only — skip huge downloads
    max_preview = 64 * 1024
    if out.get("content_length") and out["content_length"] > max_preview:
        out["preview_skipped"] = f"size > {max_preview} bytes"
        return out

    try:
        data = await vacuum.async_get_file_property(name)
        out["bytes"] = len(data)
        out["preview_hex"] = data[:256].hex()
        if data[:2] == b"\x1f\x8b":
            out["likely_gzip"] = True
        if data[:4] == b"\x89PNG":
            out["likely_png"] = True
    except Exception as exc:  # noqa: BLE001
        out["download_error"] = str(exc)

    return out


async def discover(
    email: str,
    password: str,
    europe: bool,
    device_dsn: str | None,
) -> dict[str, Any]:
    report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "region": "europe" if europe else "us",
        "account_email": email,
    }

    async with aiohttp.ClientSession() as session:
        api = get_ayla_api(email, password, websession=session, europe=europe)
        await api.async_sign_in()

        devices_raw = await api.async_list_devices()
        report["devices_on_account"] = [
            {
                "dsn": d.get("dsn"),
                "product_name": d.get("product_name"),
                "oem_model": d.get("oem_model"),
                "model": d.get("model"),
                "sw_version": d.get("sw_version"),
            }
            for d in devices_raw
        ]

        vacuums = await api.async_get_devices(update=False)
        if not vacuums:
            raise RuntimeError("No vacuums returned on this account.")

        vacuum: SharkIqVacuum | None = None
        if device_dsn:
            for v in vacuums:
                if v.serial_number == device_dsn or getattr(v, "_dsn", None) == device_dsn:
                    vacuum = v
                    break
            if vacuum is None:
                raise RuntimeError(
                    f"Device DSN {device_dsn!r} not found. "
                    f"Available: {[v.serial_number for v in vacuums]}"
                )
        else:
            vacuum = vacuums[0]

        await vacuum.async_update()
        await vacuum.async_get_metadata()

        report["device"] = {
            "name": vacuum.name,
            "dsn": vacuum.serial_number,
            "oem_model": vacuum.oem_model_number,
            "vac_model_number": vacuum.vac_model_number,
            "vac_serial_number": _redact(vacuum.vac_serial_number),
        }

        properties: list[dict[str, Any]] = []
        file_properties: list[str] = []
        settable = sorted(vacuum._settable_properties or [])

        for name in sorted(vacuum.properties_full.keys()):
            meta = vacuum.properties_full[name]
            try:
                value = vacuum.get_property_value(name)
            except Exception as exc:  # noqa: BLE001
                value = f"<read error: {exc}>"
            entry = _summarize_property(name, meta, value)
            properties.append(entry)
            if meta.get("base_type") == "file":
                file_properties.append(name)

        report["property_count"] = len(properties)
        report["properties"] = properties
        report["settable_via_set_prefix"] = settable

        report["sdk_known_properties"] = [p.value for p in Properties]
        report["sdk_operating_modes"] = {
            m.name: m.value for m in OperatingModes
        }

        # Room list helper (Matrix / LiDAR models)
        try:
            rooms = vacuum.get_room_list()
            raw_room = vacuum.get_property_value(Properties.ROBOT_ROOM_LIST)
            report["rooms"] = {
                "parsed": rooms,
                "raw_robot_room_list": raw_room,
            }
        except Exception as exc:  # noqa: BLE001
            report["rooms"] = {"error": str(exc)}

        report["file_property_probes"] = []
        for fname in file_properties:
            probe = await _probe_file_property(session, vacuum, fname)
            report["file_property_probes"].append(probe)

        # Capability matrix for app planning
        readable_names = {p["name"] for p in properties}
        report["inferred_capabilities"] = {
            "start_stop_dock": "Operating_Mode" in readable_names,
            "fan_power_mode": "Power_Mode" in readable_names,
            "room_list": "Robot_Room_List" in readable_names,
            "room_targeted_clean": "Areas_To_Clean" in settable,
            "find_beep": "Find_Device" in settable or "Find_Device" in readable_names,
            "battery": "Battery_Capacity" in readable_names,
            "errors": "Error_Code" in readable_names,
            "map_file_properties": file_properties,
            "explore_mode": hasattr(OperatingModes, "EXPLORE"),
        }

        await api.async_sign_out()
        await api.async_close_session()

    return report


def main() -> int:
    load_dotenv(ROOT / ".env")

    parser = argparse.ArgumentParser(description="Discover Shark vacuum API capabilities")
    parser.add_argument("--email", default=os.environ.get("SHARK_EMAIL"))
    parser.add_argument("--password", default=os.environ.get("SHARK_PASSWORD"))
    parser.add_argument(
        "--region",
        default=os.environ.get("SHARK_REGION", "europe"),
        choices=("europe", "us", "eu", "uk"),
        help="SharkClean account region (UK uses europe)",
    )
    parser.add_argument("--dsn", default=os.environ.get("SHARK_DEVICE_DSN"))
    parser.add_argument("-o", "--output", help="Output JSON path")
    args = parser.parse_args()

    if not args.email or not args.password:
        print(
            "Missing credentials.\n\n"
            "Create shark-vacuum/.env from .env.example with:\n"
            "  SHARK_EMAIL=...\n"
            "  SHARK_PASSWORD=...\n"
            "  SHARK_REGION=europe\n\n"
            "These are the same login details as the SharkClean app.",
            file=sys.stderr,
        )
        return 1

    europe = args.region.lower() in ("europe", "eu", "uk")

    try:
        report = asyncio.run(
            discover(args.email, args.password, europe=europe, device_dsn=args.dsn)
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Discovery failed: {exc}", file=sys.stderr)
        return 2

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = (
        Path(args.output)
        if args.output
        else REPORTS_DIR
        / f"discovery-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    )
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print(f"Wrote report: {out_path}")
    print()
    print("=== Summary ===")
    dev = report["device"]
    print(f"Device: {dev['name']} ({dev['oem_model']}) DSN={dev['dsn']}")
    print(f"Properties exposed: {report['property_count']}")
    caps = report["inferred_capabilities"]
    print(f"Room list: {report.get('rooms', {}).get('parsed', [])}")
    print(f"Settable commands: {', '.join(report['settable_via_set_prefix']) or '(none)'}")
    print(f"File/map properties: {caps.get('map_file_properties') or '(none)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
