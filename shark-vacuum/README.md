# Shark vacuum controller (discovery)

Unofficial tooling for **Shark Matrix Plus** and other SharkClean robots. Uses the same cloud API as the SharkClean app ([`sharkiq`](https://github.com/sharkiqlibs/sharkiq) / Ayla Networks).

**Backend choice:** Python + FastAPI — the only maintained unofficial SDK is Python.

## Quick start (capability discovery)

```bash
cd shark-vacuum
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your SharkClean email/password (UK: SHARK_REGION=europe)
python scripts/discover.py
```

Report is written to `reports/discovery-*.json`.

Optional: pin a device with `SHARK_DEVICE_DSN=AC000W040920697` in `.env`.

## Security

- Never commit `.env` or discovery reports (they contain device state).
- Use the same account as SharkClean; avoid linking the bot to multiple automation clouds at once.

## Next steps

After discovery, we use the report to decide what your custom app can implement (rooms, maps, zones, schedules).
