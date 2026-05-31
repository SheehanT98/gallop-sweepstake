import { NextResponse } from "next/server";
import { getWrappedForSeason } from "@/lib/wrapped/data";

type RouteContext = {
  params: Promise<{ season: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { season: raw } = await context.params;
  const season = decodeURIComponent(raw);

  try {
    const payload = await getWrappedForSeason(season);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("wrapped api error", error);
    return NextResponse.json(
      { error: "Failed to build wrapped payload" },
      { status: 500 },
    );
  }
}
