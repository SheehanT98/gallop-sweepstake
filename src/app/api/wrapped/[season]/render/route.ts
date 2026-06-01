import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getWrappedForSeason } from "@/lib/wrapped/data";
import { renderWrappedVideo } from "@/lib/wrapped/render-video";
import type { WrappedAudioConfig } from "@/lib/wrapped/types";
import { createWriteClient } from "@/lib/supabase/server";
import { getAudioBucket } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ season: string }> };

type RenderBody = {
  factIds?: string[];
  audio?: WrappedAudioConfig;
};

export async function POST(request: Request, context: RouteContext) {
  const { season: raw } = await context.params;
  const season = decodeURIComponent(raw);

  let body: RenderBody = {};
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    /* empty */
  }

  try {
    const payload = await getWrappedForSeason(season, {
      selectedFactIds: body.factIds,
      audioOverride: body.audio ?? undefined,
    });

    const outDir = path.join(process.cwd(), "remotion-out");
    await fs.mkdir(outDir, { recursive: true });
    const outputPath = path.join(
      outDir,
      `foaling-wrapped-${season.replace(/[^a-z0-9-]/gi, "_")}-${Date.now()}.mp4`,
    );

    await renderWrappedVideo(payload, outputPath);

    const buffer = await fs.readFile(outputPath);
    const supabase = createWriteClient();

    if (supabase) {
      const bucket = getAudioBucket();
      const storagePath = `renders/${season}/${path.basename(outputPath)}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (!error) {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const downloadUrl = `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
        await supabase.from("wrapped_renders").insert({
          season_label: season,
          storage_path: storagePath,
          selected_fact_ids: payload.facts.map((f) => f.id),
        });
        return NextResponse.json({
          message: "Video rendered and uploaded",
          downloadUrl,
        });
      }
    }

    if (buffer.length < 8 * 1024 * 1024) {
      return NextResponse.json({
        message: "Video rendered",
        base64: buffer.toString("base64"),
      });
    }

    return NextResponse.json({
      message: `Video saved on server at ${outputPath}. File too large for inline download — configure Supabase storage.`,
      path: outputPath,
    });
  } catch (error) {
    console.error("render error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Render failed. Ensure Chromium is available (Remotion) or run npm run remotion:render locally.",
      },
      { status: 500 },
    );
  }
}
