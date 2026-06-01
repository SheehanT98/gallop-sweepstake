import type { MusicReference } from "@/lib/wrapped/types";

export function parseMusicReference(input: string): MusicReference | null {
  const url = input.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "open.spotify.com" || host === "spotify.com") {
      return {
        platform: "spotify",
        url,
        trackTitle: null,
        artist: null,
      };
    }

    if (host === "music.apple.com") {
      return {
        platform: "apple",
        url,
        trackTitle: null,
        artist: null,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function musicReferenceLabel(ref: MusicReference | null): string {
  if (!ref) return "";
  if (ref.trackTitle && ref.artist) return `${ref.trackTitle} · ${ref.artist}`;
  if (ref.trackTitle) return ref.trackTitle;
  return ref.platform === "spotify" ? "Spotify track" : "Apple Music track";
}
