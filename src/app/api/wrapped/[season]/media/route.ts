import { NextResponse } from "next/server";
import { createWriteClient } from "@/lib/supabase/server";
import { getMediaBucket, getStoragePublicUrl } from "@/lib/supabase/storage";

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

  const bucket = getMediaBucket();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${season}/${Date.now()}-${safeName}`;
  const mediaType = file.type.startsWith("video/") ? "video" : "image";

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { count } = await supabase
    .from("wrapped_media")
    .select("*", { count: "exact", head: true })
    .eq("season_label", season);

  const { error: dbError } = await supabase.from("wrapped_media").insert({
    season_label: season,
    storage_path: storagePath,
    media_type: mediaType,
    sort_order: count ?? 0,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const url = getStoragePublicUrl(bucket, storagePath);

  return NextResponse.json({
    url,
    type: mediaType,
    storagePath,
  });
}
