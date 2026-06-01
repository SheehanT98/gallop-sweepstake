"use client";

import { useEffect, useState } from "react";
import { getStoredFactIds } from "@/lib/wrapped/selection-storage";
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
    if (!stored?.length) {
      setReady(true);
      return;
    }

    const params = new URLSearchParams({ facts: stored.join(",") });
    fetch(`/api/wrapped/${encodeURIComponent(season)}?${params}`)
      .then((r) => r.json())
      .then((data: WrappedPayload) => {
        setPayload(data);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [season]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/60">
        Loading your story…
      </div>
    );
  }

  return <WrappedStory payload={payload} />;
}
