import type { WrappedAudioConfig } from "@/lib/wrapped/types";

const PREFIX = "foaling-wrapped-audio:";

export function getStoredAudioConfig(season: string): WrappedAudioConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${season}`);
    if (!raw) return null;
    return JSON.parse(raw) as WrappedAudioConfig;
  } catch {
    return null;
  }
}

export function setStoredAudioConfig(
  season: string,
  config: WrappedAudioConfig | null,
): void {
  if (typeof window === "undefined") return;
  if (!config) {
    localStorage.removeItem(`${PREFIX}${season}`);
    return;
  }
  localStorage.setItem(`${PREFIX}${season}`, JSON.stringify(config));
}
