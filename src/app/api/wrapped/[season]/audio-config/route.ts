import { NextResponse } from "next/server";
import { z } from "zod";
import { createWriteClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  trimStartSec: z.number().min(0),
  trimEndSec: z.number().min(1),
  bpm: z.number().min(60).max(200),
  syncToBeat: z.boolean(),
  spotifyUrl: z.string().nullable().optional(),
  appleMusicUrl: z.string().nullable().optional(),
  trackTitle: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
});

type RouteContext = { params: Promise<{ season: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const supabase = createWriteClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, localOnly: true });
  }

  const { season: raw } = await context.params;
  const season = decodeURIComponent(raw);
  const json = bodySchema.safeParse(await request.json());

  if (!json.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const d = json.data;
  const { error } = await supabase
    .from("wrapped_audio")
    .update({
      trim_start_ms: Math.round(d.trimStartSec * 1000),
      trim_end_ms: Math.round(d.trimEndSec * 1000),
      bpm: d.bpm,
      sync_to_beat: d.syncToBeat,
      spotify_url: d.spotifyUrl ?? null,
      apple_music_url: d.appleMusicUrl ?? null,
      track_title: d.trackTitle ?? null,
      artist: d.artist ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("season_label", season);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
