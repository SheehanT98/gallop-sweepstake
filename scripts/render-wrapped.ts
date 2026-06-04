import path from "path";
import { getDemoFoalings } from "../src/lib/wrapped/demo-data";
import { buildWrappedPayload } from "../src/lib/wrapped/facts";
import { getWrappedForSeason } from "../src/lib/wrapped/data";
import { renderWrappedVideo } from "../src/lib/wrapped/render-video";

async function main() {
  const season = process.argv[2] ?? "2025-26";
  let payload;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      payload = await getWrappedForSeason(season);
    } catch {
      console.warn("Supabase fetch failed, using demo foalings");
    }
  }

  if (!payload) {
    const rows = getDemoFoalings(season);
    const media = [
      {
        url: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80",
        type: "image" as const,
      },
    ];
    payload = buildWrappedPayload(rows, season, media, true);
  }

  const outDir = path.join(process.cwd(), "remotion-out");
  const outputLocation = path.join(
    outDir,
    `foaling-wrapped-${season.replace(/[^a-z0-9-]/gi, "_")}.mp4`,
  );

  console.log(`Rendering Foaling Wrapped for ${season}…`);
  const { durationFrames } = await renderWrappedVideo(payload, outputLocation);
  console.log(`Done (${durationFrames} frames): ${outputLocation}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
