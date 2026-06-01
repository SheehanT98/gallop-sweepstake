import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { listSeasonPreviews } from "@/lib/wrapped/data";
import { SeasonCard } from "@/components/wrapped/season-card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function WrappedIndexPage() {
  const previews = await listSeasonPreviews();
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
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
          Your seasons
        </h1>
        <p className="mt-3 text-white/60">
          Curate which fun facts make the story, then play full-screen with
          auto-suggested stats from your foaling records.
        </p>

        <div
          className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            supabaseReady
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${supabaseReady ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          {supabaseReady ? "Supabase connected" : "Demo mode — add .env.local"}
        </div>

        <ul className="mt-10 space-y-4">
          {previews.map((preview) => (
            <SeasonCard key={preview.seasonLabel} preview={preview} />
          ))}
        </ul>

        <details className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/55">
          <summary className="cursor-pointer font-semibold text-white/80">
            Setup & video export
          </summary>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Run supabase/migrations/001_foaling_wrapped.sql</li>
            <li>Insert foalings + optional wrapped_media backgrounds</li>
            <li>Copy .env.example → .env.local</li>
          </ol>
          <p className="mt-4">
            60s MP4:{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-emerald-300">
              npm run remotion:render -- 2025-26
            </code>
          </p>
        </details>
      </div>
    </main>
  );
}
