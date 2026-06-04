import { createServerClient } from "@/lib/supabase/server";
import {
  getAudioBucket,
  getMediaBucket,
  getStoragePublicUrl,
  inferMediaType,
} from "@/lib/supabase/storage";
import { getDemoFoalings } from "@/lib/wrapped/demo-data";
import { buildWrappedPayload, computeHardStats } from "@/lib/wrapped/facts";
import type {
  FoalingRow,
  MediaItem,
  SeasonPreview,
  WrappedAudioConfig,
  WrappedPayload,
} from "@/lib/wrapped/types";

const DEMO_MEDIA: MediaItem[] = [
  {
    url: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80",
    type: "image",
  },
  {
    url: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1920&q=80",
    type: "image",
  },
  {
    url: "https://images.unsplash.com/photo-1560493676-04071c5f465d?w=1920&q=80",
    type: "image",
  },
];

export async function listSeasons(): Promise<string[]> {
  const previews = await listSeasonPreviews();
  return previews.map((p) => p.seasonLabel);
}

export async function listSeasonPreviews(): Promise<SeasonPreview[]> {
  const supabase = createServerClient();
  if (!supabase) {
    const rows = getDemoFoalings("2025-26");
    const stats = computeHardStats(rows, "2025-26");
    return [
      {
        seasonLabel: "2025-26",
        total: stats.total,
        colts: stats.colts,
        fillies: stats.fillies,
        usingDemoData: true,
      },
    ];
  }

  const { data, error } = await supabase
    .from("foalings")
    .select("season_label, sex")
    .returns<{ season_label: string; sex: "colt" | "filly" }[]>();

  if (error || !data?.length) {
    const rows = getDemoFoalings("2025-26");
    const stats = computeHardStats(rows, "2025-26");
    return [
      {
        seasonLabel: "2025-26",
        total: stats.total,
        colts: stats.colts,
        fillies: stats.fillies,
        usingDemoData: true,
      },
    ];
  }

  const bySeason = new Map<
    string,
    { colts: number; fillies: number; usingDemoData: boolean }
  >();

  for (const row of data) {
    const cur = bySeason.get(row.season_label) ?? {
      colts: 0,
      fillies: 0,
      usingDemoData: false,
    };
    if (row.sex === "colt") cur.colts++;
    else cur.fillies++;
    bySeason.set(row.season_label, cur);
  }

  return [...bySeason.entries()]
    .map(([seasonLabel, { colts, fillies, usingDemoData }]) => ({
      seasonLabel,
      total: colts + fillies,
      colts,
      fillies,
      usingDemoData,
    }))
    .sort((a, b) => b.seasonLabel.localeCompare(a.seasonLabel));
}

async function fetchFoalings(seasonLabel: string): Promise<{
  rows: FoalingRow[];
  usingDemoData: boolean;
}> {
  const supabase = createServerClient();
  if (!supabase) {
    return {
      rows: getDemoFoalings(seasonLabel),
      usingDemoData: true,
    };
  }

  const { data, error } = await supabase
    .from("foalings")
    .select(
      "id, foaled_at, sex, sire, weight_kg, dam, assisted, season_label",
    )
    .eq("season_label", seasonLabel)
    .order("foaled_at", { ascending: true })
    .returns<FoalingRow[]>();

  if (error || !data?.length) {
    return {
      rows: getDemoFoalings(seasonLabel),
      usingDemoData: true,
    };
  }

  return {
    rows: data,
    usingDemoData: false,
  };
}

export async function fetchMediaItems(seasonLabel: string): Promise<MediaItem[]> {
  const supabase = createServerClient();
  const bucket = getMediaBucket();

  if (!supabase) {
    return DEMO_MEDIA;
  }

  const { data, error } = await supabase
    .from("wrapped_media")
    .select("storage_path, media_type")
    .eq("season_label", seasonLabel)
    .order("sort_order", { ascending: true })
    .returns<{ storage_path: string; media_type: string }[]>();

  if (error || !data?.length) {
    return DEMO_MEDIA;
  }

  return data
    .map((m) => {
      const url = getStoragePublicUrl(bucket, m.storage_path);
      if (!url) return null;
      const type =
        m.media_type === "video" || m.media_type === "image"
          ? m.media_type
          : inferMediaType(m.storage_path);
      return { url, type } as MediaItem;
    })
    .filter((m): m is MediaItem => m != null);
}

export async function fetchAudioConfig(
  seasonLabel: string,
): Promise<WrappedAudioConfig | null> {
  const supabase = createServerClient();
  const bucket = getAudioBucket();

  if (!supabase) return null;

  type AudioRow = {
    storage_path: string;
    trim_start_ms: number | null;
    trim_end_ms: number | null;
    bpm: number | null;
    sync_to_beat: boolean | null;
    spotify_url: string | null;
    apple_music_url: string | null;
    track_title: string | null;
    artist: string | null;
  };

  const { data, error } = await supabase
    .from("wrapped_audio")
    .select(
      "storage_path, trim_start_ms, trim_end_ms, bpm, sync_to_beat, spotify_url, apple_music_url, track_title, artist",
    )
    .eq("season_label", seasonLabel)
    .maybeSingle()
    .returns<AudioRow>();

  if (error || !data) return null;

  const url = getStoragePublicUrl(bucket, data.storage_path);
  if (!url) return null;

  const trimStartSec = (data.trim_start_ms ?? 0) / 1000;
  const trimEndSec = data.trim_end_ms
    ? data.trim_end_ms / 1000
    : trimStartSec + 60;

  return {
    url,
    trimStartSec,
    trimEndSec,
    durationSec: trimEndSec,
    bpm: Number(data.bpm) || 120,
    syncToBeat: data.sync_to_beat ?? true,
    spotifyUrl: data.spotify_url,
    appleMusicUrl: data.apple_music_url,
    trackTitle: data.track_title,
    artist: data.artist,
  };
}

export type GetWrappedOptions = {
  selectedFactIds?: string[];
  audioOverride?: WrappedAudioConfig | null;
};

export async function getWrappedForSeason(
  seasonLabel: string,
  options?: GetWrappedOptions,
): Promise<WrappedPayload> {
  const { rows, usingDemoData } = await fetchFoalings(seasonLabel);
  const media = await fetchMediaItems(seasonLabel);
  const audio =
    options?.audioOverride !== undefined
      ? options.audioOverride
      : await fetchAudioConfig(seasonLabel);

  return buildWrappedPayload(
    rows,
    seasonLabel,
    media,
    usingDemoData,
    options?.selectedFactIds,
    audio,
  );
}
