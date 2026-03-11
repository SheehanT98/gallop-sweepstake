"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewSweepstakePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    eventDate: "",
    entryDeadline: "",
    maxParticipants: "",
    pointsFirst: "10",
    pointsSecond: "5",
    pointsThird: "2",
  });

  const getAdminKey = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("sweepstake-admin-key")
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sweepstakes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getAdminKey() || "",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      router.push(`/admin/sweepstake/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 16);

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
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold text-white">
          Create sweepstake
        </h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm text-zinc-400">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
              placeholder="e.g. Cheltenham Gold Cup 2026"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
              placeholder="The showpiece race of the Festival..."
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-zinc-400">
                Event / race date *
              </label>
              <input
                type="datetime-local"
                required
                value={form.eventDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventDate: e.target.value }))
                }
                min={today}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white focus:border-[#d4af37] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400">
                Entry deadline *
              </label>
              <input
                type="datetime-local"
                required
                value={form.entryDeadline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, entryDeadline: e.target.value }))
                }
                min={today}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white focus:border-[#d4af37] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400">
              Max participants (optional)
            </label>
            <input
              type="number"
              min={1}
              value={form.maxParticipants}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxParticipants: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white placeholder-zinc-500 focus:border-[#d4af37] focus:outline-none"
              placeholder="Leave empty for unlimited"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">
              Points (1st / 2nd / 3rd)
            </label>
            <div className="mt-1 flex gap-4">
              <input
                type="number"
                min={0}
                value={form.pointsFirst}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pointsFirst: e.target.value }))
                }
                className="w-24 rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white focus:border-[#d4af37] focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={form.pointsSecond}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pointsSecond: e.target.value }))
                }
                className="w-24 rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white focus:border-[#d4af37] focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={form.pointsThird}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pointsThird: e.target.value }))
                }
                className="w-24 rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white focus:border-[#d4af37] focus:outline-none"
              />
            </div>
          </div>
          {error && <p className="text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#d4af37] px-6 py-2 font-semibold text-white hover:bg-[#c4a030] disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </form>
      </main>
    </div>
  );
}
