import type { WrappedPayload } from "@/lib/wrapped/types";

const FPS = 30;
const OUTRO_SEC = 2;

export function computeDurationFramesFromTimeline(
  payload: WrappedPayload,
): number {
  if (payload.timeline?.slideDurationsSec.length) {
    const sec = payload.timeline.slideDurationsSec.reduce((a, b) => a + b, 0);
    return Math.round(sec * FPS);
  }
  const n = payload.facts.length;
  return Math.round((5 + Math.max(0, n - 2) * 4 + 9 + OUTRO_SEC) * FPS);
}
