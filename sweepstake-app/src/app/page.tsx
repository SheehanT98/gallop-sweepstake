import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/db";

async function getSweepstakes() {
  return prisma.sweepstake.findMany({
    where: { status: { in: ["open", "closed", "drawn", "completed"] } },
    orderBy: { eventDate: "desc" },
    include: {
      _count: { select: { entries: true, horses: true } },
    },
  });
}

export default async function HomePage() {
  const sweepstakes = await getSweepstakes();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f0d] via-[#0f2a0f] to-[#0d1f0d]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="font-display text-4xl font-bold tracking-wider text-[#d4af37] sm:text-5xl">
            SWEEPSTAKE
          </h1>
          <p className="mt-2 text-lg text-zinc-200">
            Enter the draw. Get your horse. Cheer it home.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <section>
          <h2 className="mb-6 text-xl font-semibold uppercase tracking-widest text-zinc-300">
            Upcoming sweeps
          </h2>

          {sweepstakes.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-zinc-400">
                No sweepstakes available at the moment.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Check back soon for Cheltenham, Grand National & more.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sweepstakes.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/sweepstake/${s.id}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#d4af37]/50 hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {s.name}
                      </h3>
                      {s.description && (
                        <p className="mt-1 text-sm text-zinc-400">
                          {s.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-zinc-500">
                        Race: {formatDate(s.eventDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${
                          s.status === "open"
                            ? "bg-green-500/20 text-green-400"
                            : s.status === "drawn" || s.status === "completed"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {s.status}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {s._count.entries} / {s._count.horses} entries
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 flex justify-center">
          <Link
            href="/admin"
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            Admin
          </Link>
        </div>
      </main>
    </div>
  );
}
