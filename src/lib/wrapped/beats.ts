import type { WrappedFact, WrappedTimeline } from "@/lib/wrapped/types";

const OUTRO_SEC = 2;

function snapToBeat(sec: number, beatSec: number): number {
  return Math.max(beatSec, Math.round(sec / beatSec) * beatSec);
}

function weightForCategory(cat: WrappedFact["category"]): number {
  if (cat === "title") return 1.25;
  if (cat === "stats") return 2;
  return 1;
}

/**
 * Distribute slide durations across trim window, snapping cuts to beat grid.
 * Includes a short outro slot at the end.
 */
export function computeBeatTimeline(
  facts: WrappedFact[],
  trimStartSec: number,
  trimEndSec: number,
  bpm: number,
): WrappedTimeline {
  const beatIntervalSec = 60 / Math.max(bpm, 60);
  const totalAudioSec = Math.max(trimEndSec - trimStartSec, beatIntervalSec * 4);

  const weights = [...facts.map((f) => weightForCategory(f.category)), 0.5];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const contentSec = totalAudioSec - OUTRO_SEC;

  const raw = weights.map((w) => (contentSec * w) / weightSum);
  const slideDurationsSec = raw.map((s, i) =>
    i === raw.length - 1 ? OUTRO_SEC : snapToBeat(s, beatIntervalSec),
  );

  const contentSlides = slideDurationsSec.slice(0, -1);
  const summed = contentSlides.reduce((a, b) => a + b, 0);
  if (summed > 0 && Math.abs(summed - contentSec) > 0.5) {
    const scale = contentSec / summed;
    for (let i = 0; i < contentSlides.length; i++) {
      slideDurationsSec[i] = snapToBeat(contentSlides[i] * scale, beatIntervalSec);
    }
  }
  slideDurationsSec[slideDurationsSec.length - 1] = OUTRO_SEC;

  return {
    slideDurationsSec,
    totalSec: slideDurationsSec.reduce((a, b) => a + b, 0),
    beatIntervalSec,
  };
}

export function computeFixedTimeline(
  facts: WrappedFact[],
  secondsPerSlide = 4,
): WrappedTimeline {
  const slideDurationsSec = facts.map((f) =>
    f.category === "title" ? 5 : f.category === "stats" ? 9 : secondsPerSlide,
  );
  slideDurationsSec.push(OUTRO_SEC);
  return {
    slideDurationsSec,
    totalSec: slideDurationsSec.reduce((a, b) => a + b, 0),
    beatIntervalSec: 0,
  };
}

export function buildTimeline(
  facts: WrappedFact[],
  audio: {
    trimStartSec: number;
    trimEndSec: number;
    bpm: number;
    syncToBeat: boolean;
  } | null,
): WrappedTimeline {
  if (audio?.syncToBeat) {
    return computeBeatTimeline(
      facts,
      audio.trimStartSec,
      audio.trimEndSec,
      audio.bpm,
    );
  }
  return computeFixedTimeline(facts);
}
