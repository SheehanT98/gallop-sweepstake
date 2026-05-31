import { createServerClient } from "@/lib/supabase/server";
import { getDemoFoalings } from "@/lib/wrapped/demo-data";
import { buildWrappedPayload } from "@/lib/wrapped/facts";
import type { FoalingRow, WrappedPayload } from "@/lib/wrapped/types";

const DEMO_MEDIA = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80",
  "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1920&q=80",
  "https://images.unsplash.com/photo-1560493676-04071c5f465d?w=1920&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
];

export async function listSeasons(): Promise<string[]> {
  const supabase = createServerClient();
  if (!supabase) {
    return ["2025-26"];
  }

  const { data, error } = await supabase
    .from("foalings")
    .select("season_label")
    .order("season_label", { ascending: false })
    .returns<{ season_label: string }[]>();

  if (error || !data?.length) {
    return ["2025-26"];
  }

  const unique = [...new Set(data.map((r) => r.season_label))];
  return unique.length ? unique : ["2025-26"];
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

export async function getWrappedForSeason(
  seasonLabel: string,
): Promise<WrappedPayload> {
  const { rows, usingDemoData } = await fetchFoalings(seasonLabel);
  const mediaUrls = await fetchMediaUrls(seasonLabel);
  return buildWrappedPayload(rows, seasonLabel, mediaUrls, usingDemoData);
}
