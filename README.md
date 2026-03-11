# Sweepstake System

A full end-to-end sweepstake system for horse racing events (Cheltenham Festival, Grand National, etc.).

## Quick start

```bash
cd sweepstake-app
npm install
cp .env.example .env
# Set ADMIN_SECRET in .env (e.g. ADMIN_SECRET=your-secret-key)
npx prisma migrate dev
npm run db:seed   # Optional: adds sample Cheltenham Gold Cup sweepstake
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Participants**: Browse sweepstakes → Enter → Get unique link → View assigned horse after draw
- **Admin** (`/admin`): Create sweepstakes, add horses, open/close entries, run draw, enter results

See [sweepstake-app/README.md](sweepstake-app/README.md) for full documentation.
