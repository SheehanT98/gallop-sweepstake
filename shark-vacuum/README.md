# Shark Home

Local web app that controls your **Shark Matrix / Megalodon** vacuum — same core features as SharkClean (status, map, rooms, spot, vacuum/pause/dock), running on your PC.

Uses the unofficial [sharkiq](https://github.com/sharkiqlibs/sharkiq) library (Shark cloud API). Stays on your home network for the UI; the robot still talks to Shark/Ayla cloud (same as the official app).

## Requirements

- Python 3.10+
- SharkClean account (UK: `SHARK_REGION=europe`)
- `.env` with your credentials

## Quick start (Windows)

```powershell
cd shark-vacuum
copy .env.example .env
notepad .env          # add email + password (quote password if it contains #)
.\run.ps1
```

Open **http://127.0.0.1:8765**

Or double-click `run.bat` after creating `.env`.

## Manual start

```powershell
cd shark-vacuum
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

## Features

| Screen | What it does |
|--------|----------------|
| **Home** | Status, battery, floor map, power (Eco/Normal/Max), **VACUUM** / pause |
| **Rooms** | Select rooms → clean selection |
| **Spot** | Spot clean |
| Top icons | Find (beep), return to dock |

## Discovery tool

To dump all API properties:

```powershell
python scripts/discover.py
```

## Security

- Binds to `127.0.0.1` only — not exposed to the internet by default.
- Do not commit `.env`.
- Uses the same cloud login as SharkClean; avoid linking the bot to Google Home and this app at the same time if you see “offline” issues.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Password with `#` | `SHARK_PASSWORD='#yourPass'` in `.env` |
| Auth failed | Check email/password in SharkClean app |
| Map blank | Some firmware sends non-image map blobs; cleaning still works |
| Pi-hole | Allow `ads-field.aylanetworks.com` |
