import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { getDemoFoalings } from "../src/lib/wrapped/demo-data";
import { buildWrappedPayload } from "../src/lib/wrapped/facts";
import { getWrappedForSeason } from "../src/lib/wrapped/data";
import { computeDurationFrames } from "../remotion/WrappedVideo";

async function loadPayload(season: string) {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (hasSupabase) {
    try {
      return await getWrappedForSeason(season);
    } catch {
      console.warn("Supabase fetch failed, using demo foalings");
    }
  }

  const rows = getDemoFoalings(season);
  const mediaUrls = [
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80",
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1920&q=80",
    "https://images.unsplash.com/photo-1560493676-04071c5f465d?w=1920&q=80",
  ];
  return buildWrappedPayload(rows, season, mediaUrls, true);
}

async function main() {
  const season = process.argv[2] ?? "2025-26";
  const payload = await loadPayload(season);
  const durationInFrames = computeDurationFrames(payload.facts.length);

  console.log(`Rendering Foaling Wrapped for ${season}…`);
  console.log(`Slides: ${payload.facts.length}, frames: ${durationInFrames}`);

  const entry = path.join(process.cwd(), "remotion/index.ts");
  const bundleLocation = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "FoalingWrapped",
    inputProps: { payload },
  });

  const outDir = path.join(process.cwd(), "remotion-out");
  const outputLocation = path.join(
    outDir,
    `foaling-wrapped-${season.replace(/[^a-z0-9-]/gi, "_")}.mp4`,
  );

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
    },
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps: { payload },
  });

  console.log(`Done: ${outputLocation}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
