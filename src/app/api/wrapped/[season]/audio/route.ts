import { NextResponse } from "next/server";
import { createWriteClient } from "@/lib/supabase/server";
import { getAudioBucket, getStoragePublicUrl } from "@/lib/supabase/storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ season: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = createWriteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { season: raw } = await context.params;
  const season = decodeURIComponent(raw);
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const bucket = getAudioBucket();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${season}/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: file.type || "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const trimEndMs = 60_000;

  const { error: dbError } = await supabase.from("wrapped_audio").upsert({
    season_label: season,
    storage_path: storagePath,
    trim_start_ms: 0,
    trim_end_ms: trimEndMs,
    bpm: 120,
    sync_to_beat: true,
    updated_at: new Date().toISOString(),
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const url = getStoragePublicUrl(bucket, storagePath);
  return NextResponse.json({ url, storagePath, trimEndMs });
}

