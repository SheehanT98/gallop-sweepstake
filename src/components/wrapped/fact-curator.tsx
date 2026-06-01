"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Play, RotateCcw, Sparkles } from "lucide-react";
import type { WrappedFact, WrappedPayload } from "@/lib/wrapped/types";
import { selectFactsForStory } from "@/lib/wrapped/facts";
import {
  clearStoredFactIds,
  getStoredFactIds,
  setStoredFactIds,
} from "@/lib/wrapped/selection-storage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FactCuratorProps = {
  payload: WrappedPayload;
};

function defaultSelectedIds(payload: WrappedPayload): string[] {
  const stored = getStoredFactIds(payload.seasonLabel);
  if (stored?.length) return stored;
  return selectFactsForStory(payload.allCandidates)
    .filter((f) => f.category !== "title" && f.category !== "stats")
    .map((f) => f.id);
}

export function FactCurator({ payload }: FactCuratorProps) {
  const pool = useMemo(
    () =>
      payload.allCandidates.filter(
        (f) => f.category !== "title" && f.category !== "stats",
      ),
    [payload.allCandidates],
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds(payload)),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 3) return prev;
        next.delete(id);
      } else {
        if (next.size >= 12) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const resetAuto = () => {
    clearStoredFactIds(payload.seasonLabel);
    setSelected(
      new Set(
        selectFactsForStory(payload.allCandidates)
          .filter((f) => f.category !== "title" && f.category !== "stats")
          .map((f) => f.id),
      ),
    );
  };

  const saveAndPlay = () => {
    setStoredFactIds(payload.seasonLabel, [...selected]);
  };

  const playHref = `/wrapped/${encodeURIComponent(payload.seasonLabel)}/play`;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Curate your story
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{payload.seasonLabel}</h1>
          <p className="mt-2 text-sm text-white/55">
            {selected.size} of {pool.length} facts selected · title & stats added
            automatically
            {payload.usingDemoData ? " · demo data" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={resetAuto} aria-label="Reset to auto picks">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <ul className="mt-8 space-y-2">
        {pool
          .sort((a, b) => b.score - a.score)
          .map((fact) => (
            <FactRow
              key={fact.id}
              fact={fact}
              checked={selected.has(fact.id)}
              onToggle={() => toggle(fact.id)}
            />
          ))}
      </ul>

      <div className="sticky bottom-6 mt-10 flex flex-col gap-3">
        <Link href={playHref} onClick={saveAndPlay}>
          <Button variant="default" size="lg" className="w-full">
            <Play className="h-5 w-5" />
            Play Wrapped ({selected.size} facts)
          </Button>
        </Link>
        <Link
          href={playHref}
          onClick={() => clearStoredFactIds(payload.seasonLabel)}
          className="text-center text-sm text-white/45 hover:text-white/70"
        >
          Play with auto-selected facts instead
        </Link>
      </div>
    </div>
  );
}

function FactRow({
  fact,
  checked,
  onToggle,
}: {
  fact: WrappedFact;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition",
        checked
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          checked
            ? "border-emerald-400 bg-emerald-500 text-black"
            : "border-white/30 bg-transparent",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            {fact.category}
          </span>
          {fact.visual && fact.visual !== "default" ? (
            <Sparkles className="h-3 w-3 text-emerald-400/80" />
          ) : null}
        </span>
        <span className="mt-1 block font-semibold text-white">{fact.headline}</span>
        {fact.subline ? (
          <span className="mt-0.5 block text-sm text-white/55">{fact.subline}</span>
        ) : null}
      </span>
    </button>
  );
}
