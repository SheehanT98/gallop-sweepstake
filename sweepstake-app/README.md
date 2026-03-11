# Sweepstake System

A full end-to-end sweepstake system for horse racing events like the Cheltenham Festival and Grand National. Participants enter, get randomly assigned a horse, and points are awarded for 1st, 2nd, and 3rd place.

## Features

- **Participant flow**: Browse sweepstakes → Enter with name (and optional email) → Receive unique entry link → View assigned horse after draw
- **Admin flow**: Create sweepstakes → Add horses → Open/close entries → Run random draw → Enter race results → Award points
- **Edge cases**: Entry deadlines, max participants, non-runners (withdrawn horses), configurable points (1st/2nd/3rd)

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env and set ADMIN_SECRET to a secure value
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Admin access

1. Go to `/admin`
2. Enter your `ADMIN_SECRET` (from `.env`)
3. Create a sweepstake, add horses, open entries, run the draw, enter results

## Workflow

1. **Draft** → Admin creates sweepstake, adds horses
2. **Open** → Participants can enter (until deadline or max reached)
3. **Closed** → Entries closed, admin runs the draw
4. **Drawn** → Horses assigned, admin enters race results
5. **Completed** → Results and points visible to all

## Tech stack

- Next.js 15 (App Router)
- Prisma + SQLite
- Tailwind CSS
