# Gallop · Prospect Foaling

Home hub for **Foaling Wrapped** (season recap) and **Gallop Sweepstake** (placeholder).

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — choose **Foaling Wrapped**.

## Flow

1. **Upload** — CSV foalings, photos/video B-roll, soundtrack (MP3/M4A)
2. **Curate** — drag to reorder facts, trim music, beat-sync toggle, Spotify/Apple link (reference)
3. **Play** — story with video backgrounds + synced audio
4. **Export MP4** — in-app render (or `npm run remotion:render` locally)

## Install as app (PWA)

Open on your phone → browser menu → **Add to Home Screen**. Works offline for shell navigation after first visit.

## Music & Spotify / Apple Music

You **cannot** pull audio from Spotify or Apple Music into an export (their licenses forbid it — same reason Instagram uses its own licensed library).

What we support (like Instagram’s flow):

1. Paste a **Spotify or Apple Music link** as a reference (which track you want)
2. **Upload** the MP3/M4A you own or are licensed to use
3. **Trim** start/end sliders to the hook or chorus
4. **Auto BPM** + **sync slide cuts to beats** for the Wrapped feel

## Supabase setup (when ready)

1. Create a Supabase project.
2. Run `supabase/migrations/001_foaling_wrapped.sql` in the SQL editor.
3. Create a public Storage bucket `wrapped-media` (or set `NEXT_PUBLIC_WRAPPED_MEDIA_BUCKET`).
4. Add rows to `foalings` and optional `wrapped_media` for background snaps.

### Preferred `foalings` columns

| Column | Type | Notes |
|--------|------|--------|
| `foaled_at` | timestamptz | Required — drives day/time facts |
| `sex` | `colt` \| `filly` | Required |
| `sire` | text | Optional — top sire & diversity facts |
| `weight_kg` | numeric | Optional — avg/min/max facts |
| `dam` | text | Optional — future use |
| `assisted` | boolean | Optional — assisted % fact |
| `season_label` | text | e.g. `2025-26` |
| `notes` | text | Optional |

Background media is stored in `wrapped_media` with **no link** to individual foals.

Set `WRAPPED_TIMEZONE` (default `Europe/Dublin`) for correct “Monday” and “3am” facts.

## 60-second video export

Requires Chromium (installed automatically by Remotion on first render):

```bash
npm run remotion:render -- 2025-26
```

Output: `remotion-out/foaling-wrapped-2025-26.mp4`

## API

`GET /api/wrapped/[season]` — JSON payload (facts, all candidates, hard stats, media URLs).

`GET /api/wrapped/[season]?facts=id1,id2` — story with a custom fact selection.

## Demo mode

If Supabase env vars are missing or `foalings` is empty for a season, the app uses **demo data** (132 foals) so you can try Wrapped immediately.
