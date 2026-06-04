import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createWriteClient } from "@/lib/supabase/server";
import { mapCsvRecords, parseFoalingCsv } from "@/lib/wrapped/parse-csv";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ season: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = createWriteClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured. Add env vars to enable uploads." },
      { status: 503 },
    );
  }

  const { season: raw } = await context.params;
  const season = decodeURIComponent(raw);
  const text = await request.text();

  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    return NextResponse.json(
      { error: parsed.errors[0]?.message ?? "CSV parse error" },
      { status: 400 },
    );
  }

  const { rows, errors } = parseFoalingCsv(
    mapCsvRecords(parsed.data),
    season,
  );

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  if (!rows.length) {
    return NextResponse.json({ error: "No valid rows" }, { status: 400 });
  }

  const { error } = await supabase.from("foalings").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length });
}
