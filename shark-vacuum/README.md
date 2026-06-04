# Shark Home

Local web app for **Shark Matrix / Megalodon** vacuums (e.g. RV2620, RV2500WFB-UK). Replaces the SharkClean phone UI for day-to-day control on your PC.

## Quick start (Windows)

```powershell
cd shark-vacuum
copy .env.example .env
notepad .env
.\run.ps1
```

Open **http://127.0.0.1:8765**

If login fails, you’ll be sent to **http://127.0.0.1:8765/setup** with the error and a retry button.

## `.env` (required)

```env
SHARK_EMAIL=you@example.com
SHARK_PASSWORD='#password-with-hash'
SHARK_REGION=europe
SHARK_DEVICE_DSN=AC000W040920697
```

Password starting with `#` **must** be quoted.

## Features (v1.1)

| Feature | Notes |
|---------|--------|
| Status + battery | Live refresh, connection indicator |
| Map | Auto-decode PNG/JPEG/gzip/JSON-base64; zone overlay when available |
| Room labels | From `Mobile_App_Room_Definition` when possible |
| Home / Rooms / Spot | Same tabs as SharkClean |
| VACUUM / PAUSE / RESUME | Context-aware main button |
| Room multi-clean | Fallback `AreasToClean_V2/V3` if default API fails |
| Power Eco/Normal/Max | |
| Dock + Find | |
| Multi-robot | Tap device name if account has several bots |
| UI memory | Remembers tab, floor, selected rooms (`localStorage`) |
| Setup page | Server starts even when `.env` is wrong |

## Cloud vs offline

**Requires Shark cloud** (same as SharkClean). The UI runs locally on your PC; the robot is controlled via Ayla/Shark servers. There is no fully offline mode on this hardware without firmware hacking.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Redirects to `/setup` | Fix `.env`, click Retry |
| Map blank | Cleaning still works; map blob may need a new decoder — run `python scripts/discover.py` |
| Ad blocker | Allow `ads-field.aylanetworks.com` |
| Wrong robot | Set `SHARK_DEVICE_DSN` or use device picker |

## Development

```powershell
pip install -r requirements.txt
python -m pytest tests/ -q
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

## Security

- Listens on `127.0.0.1` only by default.
- Never commit `.env` or `reports/`.
