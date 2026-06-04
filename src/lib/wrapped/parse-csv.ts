import type { FoalingRow } from "@/lib/wrapped/types";

export type ParsedFoaling = Omit<FoalingRow, "id">;

const SEX_MAP: Record<string, "colt" | "filly"> = {
  colt: "colt",
  c: "colt",
  filly: "filly",
  f: "filly",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseFoalingCsv(
  rows: Record<string, string>[],
  seasonLabel: string,
): { rows: ParsedFoaling[]; errors: string[] } {
  const errors: string[] = [];
  const parsed: ParsedFoaling[] = [];

  rows.forEach((row, idx) => {
    const line = idx + 2;
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim() !== "") return String(v).trim();
      }
      return "";
    };

    const foaledAt = get("foaled_at", "foaledat", "date", "datetime", "foaling_date");
    const sexRaw = get("sex", "gender").toLowerCase();
    const sex = SEX_MAP[sexRaw];
    if (!foaledAt) {
      errors.push(`Row ${line}: missing foaled_at`);
      return;
    }
    if (!sex) {
      errors.push(`Row ${line}: sex must be colt or filly`);
      return;
    }

    const d = new Date(foaledAt);
    if (Number.isNaN(d.getTime())) {
      errors.push(`Row ${line}: invalid date "${foaledAt}"`);
      return;
    }

    const weightRaw = get("weight_kg", "weight", "weightkg");
    const weight = weightRaw ? Number(weightRaw) : null;

    const assistedRaw = get("assisted", "assistance");
    let assisted: boolean | null = null;
    if (assistedRaw) {
      assisted = ["yes", "true", "1", "y"].includes(assistedRaw.toLowerCase());
    }

    parsed.push({
      foaled_at: d.toISOString(),
      sex,
      sire: get("sire", "stallion") || null,
      weight_kg: weight != null && !Number.isNaN(weight) ? weight : null,
      dam: get("dam", "mare") || null,
      assisted,
      season_label: seasonLabel,
    });
  });

  return { rows: parsed, errors };
}

export function mapCsvRecords(
  data: Record<string, unknown>[],
): Record<string, string>[] {
  return data.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeHeader(k)] = v == null ? "" : String(v);
    }
    return out;
  });
}
