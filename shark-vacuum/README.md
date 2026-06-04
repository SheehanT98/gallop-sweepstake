# Shark Home

Local web controller for **Shark Matrix / Megalodon** vacuums. Replaces SharkClean for daily use: map, rooms, schedules, history, and notifications.

## Quick start

```powershell
cd shark-vacuum
copy .env.example .env
notepad .env
.\run.ps1
```

Open **http://127.0.0.1:8765** (or the LAN URL from `run-mobile.ps1`).

## Features (v1.2)

| Feature | Description |
|---------|-------------|
| **Control** | Vacuum, pause, dock, find, rooms, spot, power modes |
| **Map** | Floor image + room labels + zone overlay |
| **Live robot** | Dot on map while cleaning (RT map properties) |
| **Schedules** | Local cron-style jobs (Mon–Sun, time, optional rooms) |
| **History** | Sync from `Cleaning_Statistics` cloud property |
| **Notifications** | Telegram and/or webhook on start/finish/error |
| **Mobile** | `SHARK_LAN=true` + phone browser / Add to Home Screen |

## Schedules

Stored in `data/schedules.json`. Runs when:

- Host app is **running** (background worker every ~30s)
- Day and time match (timezone from `SHARK_TIMEZONE`)
- At most **once per day** per schedule

Example: weekdays 10:00 whole-home, or Kitchen only on selected days.

## Notifications (optional)

**Telegram**

1. Chat with [@BotFather](https://t.me/BotFather) → create bot → copy token  
2. Message your bot, then open  
   `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `"chat":{"id":...}`  
3. Add to `.env`:

```env
SHARK_TELEGRAM_BOT_TOKEN=...
SHARK_TELEGRAM_CHAT_ID=...
```

**Webhook** — any URL that accepts JSON `POST`:

```env
SHARK_WEBHOOK_URL=https://...
```

## Phone on Wi-Fi

```powershell
.\run-mobile.ps1
```

## Hosting on Vercel (later)

The UI can be static on Vercel, but **this project is built to run as a long-lived Python server** because:

- Shark cloud needs persistent login + polling  
- Schedules need a background worker  
- Notifications need state change detection  
- Live map position needs frequent polls  

For Vercel later, split into:

1. **Static frontend** on Vercel  
2. **API + worker** on Railway / Fly.io / a home Pi  
3. **Database** for schedules/history (replace `data/*.json`)

See `GET /api/features` for deployment notes.

## Data files (local)

```
data/schedules.json
data/history.json
data/notification_log.json
```

Do not commit `data/` (gitignored).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Schedule didn’t run | App must be running; check timezone |
| No history | Tap **Sync from robot** on History tab |
| No robot dot | Position not exposed by firmware; map still works |
| No Telegram | Check token, chat id, bot started chat |

## Development

```powershell
pip install -r requirements.txt
python -m pytest tests/ -q
python -m app.main
```
