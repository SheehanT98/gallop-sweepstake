"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function AdminPage() {
  const [sweepstakes, setSweepstakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSweepstakes = async () => {
    const res = await fetch("/api/admin/sweepstakes", {
      headers: { "x-admin-key": adminKey },
    });
    if (res.status === 401) {
      setAuthenticated(false);
      setError("Invalid admin key");
      return;
    }
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setSweepstakes(data);
      setAuthenticated(true);
      setError(null);
    }
  };

  useEffect(() => {
    const key = typeof window !== "undefined" ? localStorage.getItem("sweepstake-admin-key") : null;
    if (key) {
      setAdminKey(key);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) {
      setLoading(false);
      return;
    }
    fetchSweepstakes()
      .finally(() => setLoading(false));
  }, [adminKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey) {
      localStorage.setItem("sweepstake-admin-key", adminKey);
      fetchSweepstakes();
    }
  };

  if (!authenticated && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1f0d]">
        <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-bold text-white">Admin login</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter your admin key to continue.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#d4af37] px-4 py-2 font-semibold text-white hover:bg-[#c4a030]"
            >
              Login
            </button>
          </form>
          <Link href="/" className="mt-4 block text-center text-sm text-zinc-500 hover:text-zinc-400">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1f0d] via-[#0f2a0f] to-[#0d1f0d]">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <h1 className="text-xl font-bold text-[#d4af37]">Admin</h1>
          <div className="flex gap-4">
            <Link
              href="/admin/new"
              className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-white hover:bg-[#c4a030]"
            >
              New sweepstake
            </Link>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-400">
              View site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {loading ? (
          <p className="text-zinc-400">Loading...</p>
        ) : (
          <div className="space-y-4">
            {sweepstakes.map((s: any) => (
              <Link
                key={s.id}
                href={`/admin/sweepstake/${s.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#d4af37]/50 hover:bg-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {s.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatDate(s.eventDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${
                        s.status === "draft"
                          ? "bg-zinc-500/20 text-zinc-400"
                          : s.status === "open"
                            ? "bg-green-500/20 text-green-400"
                            : s.status === "completed"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {s._count.entries} entries · {s._count.horses} horses
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
