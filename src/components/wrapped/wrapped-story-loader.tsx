"use client";

import { useEffect, useState } from "react";
import { getStoredAudioConfig } from "@/lib/wrapped/audio-storage";
import { getStoredFactIds } from "@/lib/wrapped/selection-storage";
import { buildTimeline } from "@/lib/wrapped/beats";
import type { WrappedPayload } from "@/lib/wrapped/types";
import { WrappedStory } from "@/components/wrapped/wrapped-story";

type WrappedStoryLoaderProps = {
  season: string;
  initialPayload: WrappedPayload;
};

export function WrappedStoryLoader({
  season,
  initialPayload,
}: WrappedStoryLoaderProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredFactIds(season);
    const storedAudio = getStoredAudioConfig(season);

    const params = new URLSearchParams();
    if (stored?.length) params.set("facts", stored.join(","));

    fetch(`/api/wrapped/${encodeURIComponent(season)}?${params}`)
      .then((r) => r.json())
      .then((data: WrappedPayload) => {
        const audio = storedAudio ?? data.audio;
        const timeline = buildTimeline(
          data.facts,
          audio
            ? {
                trimStartSec: audio.trimStartSec,
                trimEndSec: audio.trimEndSec,
                bpm: audio.bpm,
                syncToBeat: audio.syncToBeat,
              }
            : null,
        );
        setPayload({ ...data, audio, timeline });
        setReady(true);
      })
      .catch(() => {
        const audio = storedAudio ?? initialPayload.audio;
        setPayload({
          ...initialPayload,
          audio,
          timeline: buildTimeline(
            initialPayload.facts,
            audio
              ? {
                  trimStartSec: audio.trimStartSec,
                  trimEndSec: audio.trimEndSec,
                  bpm: audio.bpm,
                  syncToBeat: audio.syncToBeat,
                }
              : null,
          ),
        });
        setReady(true);
      });
  }, [season, initialPayload]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/60">
        Loading your story…
      </div>
    );
  }

  return <WrappedStory payload={payload} />;
}
