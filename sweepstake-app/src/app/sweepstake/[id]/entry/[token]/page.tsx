"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function EntryPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      setToken(p.token);
    });
  }, [params]);

  useEffect(() => {
    if (!id || !token) return;
    fetch(`/api/sweepstakes/${id}/entry/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setEntry(data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1f0d]">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1f0d]">
        <p className="text-red-400">{error || "Entry not found"}</p>
        <Link href="/" className="text-[#d4af37] hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const sweepstake = entry.sweepstake;
  const hasResults = sweepstake?.results?.length > 0;
  const myResult = hasResults
    ? sweepstake.results.find((r: any) => r.horseId === entry.horseId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f0d] via-[#0f2a0f] to-[#0d1f0d]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href={`/sweepstake/${id}`}
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            ← Back to {sweepstake?.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            {sweepstake?.name}
          </h1>
          <p className="mt-2 text-zinc-400">{entry.participantName}</p>

          {entry.horse ? (
            <div className="mt-12">
              <p className="text-sm uppercase tracking-widest text-zinc-500">
                Your horse
              </p>
              <p className="mt-4 text-4xl font-bold text-[#d4af37]">
                {entry.horse.name}
              </p>
              {entry.horse.isNonRunner && (
                <p className="mt-2 text-amber-400">Non-runner</p>
              )}

              {hasResults && myResult && (
                <div className="mt-4 rounded-lg bg-[#d4af37]/20 px-6 py-4">
                  <p className="text-lg font-semibold text-[#d4af37]">
                    {myResult.position === 1
                      ? "1st place!"
                      : myResult.position === 2
                        ? "2nd place!"
                        : "3rd place!"}
                  </p>
                  <p className="text-zinc-400">
                    +{myResult.points} points
                  </p>
                </div>
              )}

              {hasResults && !myResult && (
                <p className="mt-4 text-zinc-500">
                  Your horse didn&apos;t place in the top 3.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-12">
              <p className="text-zinc-500">
                The draw hasn&apos;t been run yet. Check back after the race
                organiser has completed the draw.
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Race: {formatDate(sweepstake?.eventDate)}
              </p>
            </div>
          )}

          {hasResults && (
            <div className="mt-12 text-left">
              <h3 className="text-lg font-semibold text-[#d4af37]">
                Full results
              </h3>
              <ol className="mt-4 space-y-2">
                {sweepstake.results.map((r: any) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-4 rounded-lg bg-black/20 px-4 py-2"
                  >
                    <span className="w-8 text-[#d4af37] font-bold">
                      {r.position === 1 ? "1st" : r.position === 2 ? "2nd" : "3rd"}
                    </span>
                    <span className="text-white">{r.horse.name}</span>
                    <span className="text-zinc-500">+{r.points} pts</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
