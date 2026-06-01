"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Play, Plus, RotateCcw } from "lucide-react";
import type { WrappedFact, WrappedPayload } from "@/lib/wrapped/types";
import { selectFactsForStory } from "@/lib/wrapped/facts";
import {
  clearStoredFactIds,
  getStoredFactIds,
  setStoredFactIds,
} from "@/lib/wrapped/selection-storage";
import { SortableFactList } from "@/components/wrapped/sortable-fact-list";
import { AudioEditor } from "@/components/wrapped/audio-editor";
import { ExportVideoPanel } from "@/components/wrapped/export-video-panel";
import { Button } from "@/components/ui/button";
import type { WrappedAudioConfig } from "@/lib/wrapped/types";
import { getStoredAudioConfig, setStoredAudioConfig } from "@/lib/wrapped/audio-storage";

type FactCuratorProps = {
  payload: WrappedPayload;
};

function defaultOrderedIds(payload: WrappedPayload): string[] {
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

  const byId = useMemo(
    () => new Map(pool.map((f) => [f.id, f])),
    [pool],
  );

  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    defaultOrderedIds(payload),
  );
  const [audio, setAudio] = useState<WrappedAudioConfig | null>(
    () => payload.audio ?? getStoredAudioConfig(payload.seasonLabel),
  );

  const selectedSet = useMemo(() => new Set(orderedIds), [orderedIds]);
  const orderedFacts = orderedIds
    .map((id) => byId.get(id))
    .filter((f): f is WrappedFact => !!f);

  const available = pool.filter((f) => !selectedSet.has(f.id));

  const togglePool = (id: string) => {
    setOrderedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 3) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 12) return prev;
      return [...prev, id];
    });
  };

  const resetAuto = () => {
    clearStoredFactIds(payload.seasonLabel);
    setOrderedIds(
      selectFactsForStory(payload.allCandidates)
        .filter((f) => f.category !== "title" && f.category !== "stats")
        .map((f) => f.id),
    );
  };

  const saveAndPlay = () => {
    setStoredFactIds(payload.seasonLabel, orderedIds);
    if (audio) setStoredAudioConfig(payload.seasonLabel, audio);
  };

  const playHref = `/wrapped/${encodeURIComponent(payload.seasonLabel)}/play`;
  const uploadHref = `/wrapped/${encodeURIComponent(payload.seasonLabel)}/upload`;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Curate your story
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{payload.seasonLabel}</h1>
          <p className="mt-2 text-sm text-white/55">
            Drag to reorder · {orderedIds.length} facts in story
            {payload.usingDemoData ? " · demo data" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={resetAuto} aria-label="Reset">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Story order
        </p>
        <SortableFactList facts={orderedFacts} onReorder={setOrderedIds} />
      </div>

      {available.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Add facts
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {available
              .sort((a, b) => b.score - a.score)
              .map((fact) => (
                <li key={fact.id}>
                  <button
                    type="button"
                    onClick={() => togglePool(fact.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-white/20"
                  >
                    <Plus className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs uppercase text-white/40">
                        {fact.category}
                      </span>
                      <span className="block truncate font-medium text-white">
                        {fact.headline}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <AudioEditor
        season={payload.seasonLabel}
        initial={payload.audio ?? getStoredAudioConfig(payload.seasonLabel)}
        onChange={setAudio}
      />

      <ExportVideoPanel season={payload.seasonLabel} />

      <div className="sticky bottom-6 flex flex-col gap-3">
        <Link href={playHref} onClick={saveAndPlay}>
          <Button variant="default" size="lg" className="w-full">
            <Play className="h-5 w-5" />
            Play Wrapped
          </Button>
        </Link>
        <Link
          href={uploadHref}
          className="text-center text-sm text-white/45 hover:text-white/70"
        >
          Upload foalings, photos & video
        </Link>
      </div>
    </div>
  );
}
