import type { FoalingRow } from "@/lib/wrapped/types";

/** Demo season when Supabase has no rows — mirrors a busy foaling unit */
export function getDemoFoalings(seasonLabel: string): FoalingRow[] {
  const base = new Date("2025-02-01T00:00:00Z");
  const rows: FoalingRow[] = [];
  const sires = ["Galileo", "Frankel", "Dubawi", "Galileo", "Sea The Stars", "Frankel"];
  let id = 0;

  for (let i = 0; i < 132; i++) {
    const dayOffset = Math.floor((i * 2.7) % 300);
    const hour = [2, 3, 3, 4, 14, 22, 23, 1, 6][i % 9];
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, (i * 17) % 60, 0, 0);

    const isColt = i < 70;
    const sire = sires[i % sires.length];
    const weight = 48 + (i % 15) + (isColt ? 2 : 0);

    rows.push({
      id: `demo-${id++}`,
      foaled_at: d.toISOString(),
      sex: isColt ? "colt" : "filly",
      sire,
      weight_kg: i % 11 === 0 ? null : weight,
      dam: `Dam ${(i % 40) + 1}`,
      assisted: i % 17 === 0,
      season_label: seasonLabel,
    });
  }

  return rows;
}
