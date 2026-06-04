#!/usr/bin/env python3
"""Probe Shark robot capabilities via cloud API. See README."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import aiohttp
from dotenv import load_dotenv

from sharkiq import get_ayla_api
from sharkiq.sharkiq import OperatingModes, Properties, SharkIqVacuum

ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = ROOT / "reports"


async def discover(email: str, password: str, europe: bool, device_dsn: str | None) -> dict:
    report: dict = {"generated_at": datetime.now(timezone.utc).isoformat()}
    async with aiohttp.ClientSession() as session:
        api = get_ayla_api(email, password, websession=session, europe=europe)
        await api.async_sign_in()
        vacuums = await api.async_get_devices(update=False)
        vacuum = vacuums[0]
        if device_dsn:
            for v in vacuums:
                if v.serial_number == device_dsn:
                    vacuum = v
                    break
        await vacuum.async_update()
        await vacuum.async_get_metadata()
        report["device"] = {
            "name": vacuum.name,
            "dsn": vacuum.serial_number,
            "oem_model": vacuum.oem_model_number,
        }
        report["rooms"] = vacuum.get_room_list()
        report["property_count"] = len(vacuum.properties_full)
        report["settable"] = sorted(vacuum._settable_properties or [])
        await api.async_sign_out()
        await api.async_close_session()
    return report


def main() -> int:
    load_dotenv(ROOT / ".env")
    p = argparse.ArgumentParser()
    p.add_argument("--email", default=os.getenv("SHARK_EMAIL"))
    p.add_argument("--password", default=os.getenv("SHARK_PASSWORD"))
    p.add_argument("--region", default=os.getenv("SHARK_REGION", "europe"))
    p.add_argument("--dsn", default=os.getenv("SHARK_DEVICE_DSN"))
    args = p.parse_args()
    if not args.email or not args.password:
        print("Set SHARK_EMAIL and SHARK_PASSWORD in .env", file=sys.stderr)
        return 1
    europe = args.region.lower() in ("europe", "eu", "uk")
    report = asyncio.run(discover(args.email, args.password, europe, args.dsn))
    REPORTS_DIR.mkdir(exist_ok=True)
    out = REPORTS_DIR / f"discovery-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {out}")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
