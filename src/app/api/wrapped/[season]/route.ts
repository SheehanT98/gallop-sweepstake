import { NextResponse } from "next/server";
import { getWrappedForSeason } from "@/lib/wrapped/data";

type RouteContext = {
  params: Promise<{ season: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { season: raw } = await context.params;
  const season = decodeURIComponent(raw);
  const { searchParams } = new URL(request.url);
  const factsParam = searchParams.get("facts");
  const selectedFactIds = factsParam
    ? factsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  try {
    const payload = await getWrappedForSeason(season, { selectedFactIds });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("wrapped api error", error);
    return NextResponse.json(
      { error: "Failed to build wrapped payload" },
      { status: 500 },
    );
  }
}
