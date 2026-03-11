"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function AdminSweepstakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [sweepstake, setSweepstake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [horseNames, setHorseNames] = useState("");
  const [results, setResults] = useState<{ horseId: string; position: number }[]>([]);

  const getAdminKey = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("sweepstake-admin-key")
      : null;

  const fetchSweepstake = async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/sweepstakes/${id}`, {
      headers: { "x-admin-key": getAdminKey() || "" },
    });
    if (res.status === 401) {
      window.location.href = "/admin";
      return;
    }
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setSweepstake(data);
      setError(null);
      if (data.results?.length) {
        setResults(
          data.results.map((r: any) => ({
            horseId: r.horseId,
            position: r.position,
          }))
        );
      }
    }
  };

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (id) fetchSweepstake().finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    setAction("status");
    setError(null);
    try {
      const res = await fetch(`/api/admin/sweepstakes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey() || "",
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSweepstake((s: any) => ({ ...s, status }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const addHorses = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = horseNames
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setAction("horses");
    setError(null);
    try {
      const res = await fetch(`/api/admin/sweepstakes/${id}/horses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey() || "",
        },
        body: JSON.stringify(names.map((name) => ({ name }))),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSweepstake((s: any) => ({ ...s, horses: data.horses }));
      setHorseNames("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const toggleNonRunner = async (horseId: string, isNonRunner: boolean) => {
    setAction("nonrunner");
    setError(null);
    try {
      const res = await fetch(`/api/admin/sweepstakes/${id}/horses`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey() || "",
        },
        body: JSON.stringify({ horseId, isNonRunner }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSweepstake((s: any) => ({
        ...s,
        horses: s.horses.map((h: any) =>
          h.id === horseId ? { ...h, isNonRunner } : h
        ),
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const runDraw = async () => {
    if (!confirm("Run the draw? This will randomly assign horses to all entries. This cannot be undone."))
      return;
    setAction("draw");
    setError(null);
    try {
      const res = await fetch(`/api/admin/sweepstakes/${id}/draw`, {
        method: "POST",
        headers: { "x-admin-key": getAdminKey() || "" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSweepstake(data.sweepstake);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const saveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = results.filter((r) => r.horseId && r.position >= 1 && r.position <= 3);
    if (valid.length === 0) {
      setError("Add at least one result (1st, 2nd, or 3rd)");
      return;
    }
    setAction("results");
    setError(null);
    try {
      const res = await fetch(`/api/admin/sweepstakes/${id}/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey() || "",
        },
        body: JSON.stringify({ results: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSweepstake(data.sweepstake);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const setResultPosition = (horseId: string, position: number) => {
    if (!horseId) {
      setResults((prev) => prev.filter((r) => r.position !== position));
      return;
    }
    setResults((prev) => {
      const filtered = prev.filter((r) => r.horseId !== horseId && r.position !== position);
      return [...filtered, { horseId, position }].sort((a, b) => a.position - b.position);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1f0d]">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!sweepstake) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1f0d]">
        <p className="text-red-400">{error || "Not found"}</p>
        <Link href="/admin" className="text-[#d4af37] hover:underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const runners = sweepstake.horses?.filter((h: any) => !h.isNonRunner) || [];
  const canDraw =
    sweepstake.status === "closed" &&
    sweepstake.entries?.length > 0 &&
    runners.length >= sweepstake.entries.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f0d] via-[#0f2a0f] to-[#0d1f0d]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href="/admin"
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            ← Back to admin
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">
            {sweepstake.name}
          </h1>
          <p className="mt-1 text-zinc-500">
            {formatDate(sweepstake.eventDate)} · {sweepstake._count?.entries || sweepstake.entries?.length} entries
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-12">
        {error && (
          <div className="rounded-lg bg-red-500/20 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Status */}
        <section>
          <h2 className="text-lg font-semibold text-[#d4af37]">Status</h2>
          <p className="mt-1 text-zinc-500">Current: {sweepstake.status}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["draft", "open", "closed", "drawn", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={action === "status"}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  sweepstake.status === s
                    ? "bg-[#d4af37] text-white"
                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                } disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Horses */}
        <section>
          <h2 className="text-lg font-semibold text-[#d4af37]">Horses</h2>
          {sweepstake.entries?.length === 0 && (
            <form onSubmit={addHorses} className="mt-4">
              <textarea
                value={horseNames}
                onChange={(e) => setHorseNames(e.target.value)}
                placeholder="One per line or comma-separated"
                rows={6}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
              />
              <button
                type="submit"
                disabled={action === "horses" || !horseNames.trim()}
                className="mt-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4a030] disabled:opacity-50"
              >
                Add horses
              </button>
            </form>
          )}
          {sweepstake.horses?.length > 0 && (
            <ul className="mt-4 space-y-2">
              {sweepstake.horses.map((h: any) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2"
                >
                  <span className={h.isNonRunner ? "text-zinc-500 line-through" : "text-white"}>
                    {h.name}
                  </span>
                  {sweepstake.entries?.length > 0 && (
                    <button
                      onClick={() => toggleNonRunner(h.id, !h.isNonRunner)}
                      disabled={action === "nonrunner"}
                      className={`text-xs px-2 py-1 rounded ${
                        h.isNonRunner
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30"
                      }`}
                    >
                      {h.isNonRunner ? "Non-runner" : "Mark non-runner"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Draw */}
        {sweepstake.status !== "drawn" && sweepstake.status !== "completed" && (
          <section>
            <h2 className="text-lg font-semibold text-[#d4af37]">Draw</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Close entries first, then run the draw to randomly assign horses.
            </p>
            <button
              onClick={runDraw}
              disabled={!canDraw || action === "draw"}
              className="mt-4 rounded-lg bg-[#d4af37] px-6 py-2 font-medium text-white hover:bg-[#c4a030] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action === "draw" ? "Running..." : "Run draw"}
            </button>
            {!canDraw && sweepstake.status === "closed" && (
              <p className="mt-2 text-sm text-amber-400">
                Need {sweepstake.entries?.length || 0} runners, have {runners.length}
              </p>
            )}
          </section>
        )}

        {/* Assignments (after draw) */}
        {sweepstake.entries?.length > 0 && sweepstake.entries[0]?.horse && (
          <section>
            <h2 className="text-lg font-semibold text-[#d4af37]">
              Assignments
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-zinc-500">
                    <th className="pb-2 pr-4">Participant</th>
                    <th className="pb-2">Horse</th>
                  </tr>
                </thead>
                <tbody>
                  {sweepstake.entries.map((e: any) => (
                    <tr key={e.id} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-white">{e.participantName}</td>
                      <td className="py-2 text-zinc-300">{e.horse?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Results */}
        {(sweepstake.status === "drawn" || sweepstake.status === "completed") && (
          <section>
            <h2 className="text-lg font-semibold text-[#d4af37]">
              Race results
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Select 1st, 2nd, 3rd to award points.
            </p>
            <form onSubmit={saveResults} className="mt-4 space-y-4">
              {[1, 2, 3].map((pos) => (
                <div key={pos}>
                  <label className="block text-sm text-zinc-400">
                    {pos === 1 ? "1st" : pos === 2 ? "2nd" : "3rd"} place
                  </label>
                  <select
                    value={results.find((r) => r.position === pos)?.horseId || ""}
                    onChange={(e) =>
                      setResultPosition(e.target.value, pos)
                    }
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                  >
                    <option value="">Select horse</option>
                    {runners.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                type="submit"
                disabled={action === "results"}
                className="rounded-lg bg-[#d4af37] px-6 py-2 font-medium text-white hover:bg-[#c4a030] disabled:opacity-50"
              >
                {action === "results" ? "Saving..." : "Save results"}
              </button>
            </form>
            {sweepstake.results?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-zinc-400">
                  Current results
                </h3>
                <ol className="mt-2 space-y-1">
                  {sweepstake.results.map((r: any) => (
                    <li key={r.id} className="text-white">
                      {r.position === 1 ? "1st" : r.position === 2 ? "2nd" : "3rd"}: {r.horse.name} (+{r.points} pts)
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        <div className="pt-8">
          <Link
            href={`/sweepstake/${id}`}
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            View public page →
          </Link>
        </div>
      </main>
    </div>
  );
}
