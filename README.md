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

1. **Seasons** — preview totals per `season_label`
2. **Curate** — tick/untick auto-suggested fun facts (saved in browser)
3. **Play** — full-screen story with animated charts, Ken Burns backgrounds, share & replay
4. **Video** — optional Remotion export (see below)

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
