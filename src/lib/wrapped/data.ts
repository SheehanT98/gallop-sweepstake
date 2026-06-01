import { createServerClient } from "@/lib/supabase/server";
import { getDemoFoalings } from "@/lib/wrapped/demo-data";
import { buildWrappedPayload, computeHardStats } from "@/lib/wrapped/facts";
import type {
  FoalingRow,
  SeasonPreview,
  WrappedPayload,
} from "@/lib/wrapped/types";

const DEMO_MEDIA = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80",
  "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1920&q=80",
  "https://images.unsplash.com/photo-1560493676-04071c5f465d?w=1920&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80",
  "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1920&q=80",
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

async function fetchMediaUrls(seasonLabel: string): Promise<string[]> {
  const supabase = createServerClient();
  const bucket =
    process.env.NEXT_PUBLIC_WRAPPED_MEDIA_BUCKET ?? "wrapped-media";

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

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return DEMO_MEDIA;

  return data.map((m) => {
    const path = encodeURIComponent(m.storage_path);
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  });
}

export type GetWrappedOptions = {
  selectedFactIds?: string[];
};

export async function getWrappedForSeason(
  seasonLabel: string,
  options?: GetWrappedOptions,
): Promise<WrappedPayload> {
  const { rows, usingDemoData } = await fetchFoalings(seasonLabel);
  const mediaUrls = await fetchMediaUrls(seasonLabel);
  return buildWrappedPayload(
    rows,
    seasonLabel,
    mediaUrls,
    usingDemoData,
    options?.selectedFactIds,
  );
}
