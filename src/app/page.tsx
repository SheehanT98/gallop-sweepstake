import { OptionCard } from "@/components/home/option-card";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16 sm:py-24">
        <header className="mb-16 animate-fade-up">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400/90">
            Prospect Foaling Unit
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Gallop
          </h1>
          <p className="mt-4 max-w-lg text-lg text-white/60">
            Your foaling season, wrapped — or sweepstakes when you&apos;re ready.
          </p>
        </header>

        <div className="grid animate-fade-up gap-6 [animation-delay:120ms] sm:grid-cols-2">
          <OptionCard
            href="/wrapped"
            title="Foaling Wrapped"
            description="Curate fun facts, play a Spotify-style story, export a 60-second recap."
            accent="emerald"
            badge="Season review"
          />
          <OptionCard
            href="#"
            title="Gallop Sweepstake"
            description="Run sweepstakes and draws for your team and owners."
            accent="amber"
            badge="Coming soon"
            disabled
          />
        </div>
      </div>
    </main>
  );
}
