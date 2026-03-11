"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function SweepstakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [sweepstake, setSweepstake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [success, setSuccess] = useState<{ entryToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sweepstakes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSweepstake(data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEntering(true);
    setError(null);
    try {
      const res = await fetch(`/api/sweepstakes/${id}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: form.name,
          participantEmail: form.email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enter");
      setSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEntering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1f0d]">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error && !sweepstake) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1f0d]">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="text-[#d4af37] hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const entryUrl =
    success && id
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/sweepstake/${id}/entry/${success.entryToken}`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f0d] via-[#0f2a0f] to-[#0d1f0d]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            ← Back to sweepstakes
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-bold text-white">{sweepstake?.name}</h1>
          {sweepstake?.description && (
            <p className="mt-2 text-zinc-400">{sweepstake.description}</p>
          )}
          <p className="mt-2 text-sm text-zinc-500">
            Race: {formatDate(sweepstake?.eventDate)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {sweepstake?._count?.entries} entries · {sweepstake?.horses?.length}{" "}
            horses
          </p>

          {sweepstake?.results?.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-[#d4af37]">
                Race Results
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

          {sweepstake?.status === "open" && !success && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-white">
                Enter the sweepstake
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Entries close {formatDate(sweepstake.entryDeadline)}
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400">
                    Your name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={entering}
                  className="rounded-lg bg-[#d4af37] px-6 py-2 font-semibold text-white hover:bg-[#c4a030] disabled:opacity-50"
                >
                  {entering ? "Entering..." : "Enter"}
                </button>
              </form>
            </div>
          )}

          {success && entryUrl && (
            <div className="mt-12 rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/10 p-6">
              <h3 className="text-lg font-semibold text-[#d4af37]">
                You&apos;re in!
              </h3>
              <p className="mt-2 text-zinc-300">
                Save this link to view your horse after the draw. Don&apos;t
                share it — it&apos;s your personal entry.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={entryUrl}
                  className="flex-1 min-w-[200px] rounded bg-black/30 px-4 py-2 text-sm text-zinc-300"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(entryUrl)}
                  className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4a030]"
                >
                  Copy link
                </button>
              </div>
              <Link
                href={`/sweepstake/${id}/entry/${success.entryToken}`}
                className="mt-4 inline-block text-sm text-[#d4af37] hover:underline"
              >
                View my entry →
              </Link>
            </div>
          )}

          {(sweepstake?.status === "open" && success) ||
          sweepstake?.status === "closed" ||
          sweepstake?.status === "drawn" ? (
            <p className="mt-6 text-sm text-zinc-500">
              Entries are{" "}
              {sweepstake.status === "open"
                ? "open"
                : sweepstake.status === "drawn" || sweepstake.status === "completed"
                  ? "closed. Draw complete."
                  : "closed."}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
