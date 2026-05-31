import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { listSeasons } from "@/lib/wrapped/data";
export default async function WrappedIndexPage() {
  const seasons = await listSeasons();

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <div className="mx-auto mt-10 max-w-lg">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            Foaling Wrapped
          </span>
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          Pick a season
        </h1>
        <p className="mt-3 text-white/60">
          Stats are pulled from your Supabase foalings table. Demo data is used
          when the table is empty or not configured yet.
        </p>

        <ul className="mt-10 space-y-3">
          {seasons.map((season) => (
            <li key={season}>
              <Link
                href={`/wrapped/${encodeURIComponent(season)}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-5 transition hover:border-emerald-500/40 hover:bg-white/10"
              >
                <span className="text-xl font-bold text-white">{season}</span>
                <span className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">
                  Play
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/55">
          <p className="font-semibold text-white/80">Setup</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Run the SQL in supabase/migrations/001_foaling_wrapped.sql</li>
            <li>Add foaling rows and optional wrapped_media backgrounds</li>
            <li>Set env vars from .env.example</li>
          </ol>
          <p className="mt-4">
            Export a 60s video:{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-emerald-300">
              npm run remotion:render -- 2025-26
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
