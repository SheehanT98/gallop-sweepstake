import path from "path";
import type { WrappedPayload } from "@/lib/wrapped/types";
import { computeDurationFramesFromTimeline } from "@/lib/wrapped/video-duration";

export async function renderWrappedVideo(
  payload: WrappedPayload,
  outputPath: string,
): Promise<{ outputPath: string; durationFrames: number }> {
  const durationInFrames = computeDurationFramesFromTimeline(payload);

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const entry = path.join(process.cwd(), "remotion/index.ts");
  const serveUrl = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl,
    id: "FoalingWrapped",
    inputProps: { payload },
  });

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
    },
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { payload },
  });

  return { outputPath, durationFrames: durationInFrames };
}
