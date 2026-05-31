import type {
  FoalingRow,
  HardStats,
  WrappedFact,
  WrappedPayload,
} from "@/lib/wrapped/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getTimezone(): string {
  return process.env.WRAPPED_TIMEZONE ?? "Europe/Dublin";
}

function zonedParts(iso: string, timeZone: string) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: weekdayMap[parts.weekday ?? "Mon"] ?? 0,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatShortRange(from: string, to: string, timeZone: string): string {
  const a = zonedParts(from, timeZone);
  const b = zonedParts(to, timeZone);
  if (a.month === b.month && a.year === b.year) {
    return `${a.day}–${b.day} ${MONTH_NAMES[a.month - 1]}`;
  }
  return `${formatDate(from, timeZone)} – ${formatDate(to, timeZone)}`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function computeHardStats(
  rows: FoalingRow[],
  seasonLabel: string,
): HardStats {
  const timeZone = getTimezone();
  const colts = rows.filter((r) => r.sex === "colt").length;
  const fillies = rows.filter((r) => r.sex === "filly").length;
  const total = rows.length;
  const sorted = [...rows].sort(
    (a, b) => new Date(a.foaled_at).getTime() - new Date(b.foaled_at).getTime(),
  );

  const sireCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.sire?.trim()) {
      const s = r.sire.trim();
      sireCounts.set(s, (sireCounts.get(s) ?? 0) + 1);
    }
  }
  let topSire: string | null = null;
  let topSireCount = 0;
  for (const [sire, n] of sireCounts) {
    if (n > topSireCount) {
      topSire = sire;
      topSireCount = n;
    }
  }

  const weights = rows
    .map((r) => r.weight_kg)
    .filter((w): w is number => w != null && !Number.isNaN(w));

  let nightCount = 0;
  let assistedCount = 0;
  let assistedTotal = 0;
  for (const r of rows) {
    const { hour } = zonedParts(r.foaled_at, timeZone);
    if (hour >= 22 || hour < 6) nightCount++;
    if (r.assisted != null) {
      assistedTotal++;
      if (r.assisted) assistedCount++;
    }
  }

  return {
    total,
    colts,
    fillies,
    coltPct: pct(colts, total),
    fillyPct: pct(fillies, total),
    seasonLabel,
    dateFrom: sorted[0] ? formatDate(sorted[0].foaled_at, timeZone) : "—",
    dateTo: sorted.at(-1)
      ? formatDate(sorted.at(-1)!.foaled_at, timeZone)
      : "—",
    topSire,
    topSireCount,
    uniqueSires: sireCounts.size,
    avgWeightKg: weights.length
      ? round1(weights.reduce((a, b) => a + b, 0) / weights.length)
      : null,
    minWeightKg: weights.length ? Math.min(...weights) : null,
    maxWeightKg: weights.length ? Math.max(...weights) : null,
    weightRecordedCount: weights.length,
    nightPct: pct(nightCount, total),
    assistedPct:
      assistedTotal > 0 ? pct(assistedCount, assistedTotal) : null,
  };
}

function buildCandidates(
  rows: FoalingRow[],
  seasonLabel: string,
  stats: HardStats,
): WrappedFact[] {
  const timeZone = getTimezone();
  const candidates: WrappedFact[] = [];

  candidates.push({
    id: "title",
    category: "title",
    headline: "Prospect Foaling",
    subline: `Wrapped · ${seasonLabel}`,
    score: 1000,
  });

  if (rows.length === 0) return candidates;

  candidates.push({
    id: "volume-total",
    category: "volume",
    headline: `${stats.total} foals`,
    subline: "born this season",
    score: 900,
    metadata: { total: stats.total },
  });

  if (stats.colts > 0 && stats.fillies > 0) {
    const leader = stats.colts >= stats.fillies ? "Colts" : "Fillies";
    const leadCount = Math.max(stats.colts, stats.fillies);
    const leadPct = Math.max(stats.coltPct, stats.fillyPct);
    candidates.push({
      id: "sex-split",
      category: "sex",
      headline: `${leader} led the barn`,
      subline: `${leadCount} foals · ${leadPct}% of the season`,
      score: 850,
    });
  }

  const byWeekday = new Array(7).fill(0);
  for (const r of rows) {
    byWeekday[zonedParts(r.foaled_at, timeZone).weekday]++;
  }
  const maxWd = Math.max(...byWeekday);
  const maxWdIdx = byWeekday.indexOf(maxWd);
  if (maxWd >= 5) {
    candidates.push({
      id: "weekday-peak",
      category: "weekday",
      headline: `${maxWd} foals on ${DAY_NAMES[maxWdIdx]}s`,
      subline: `Your busiest foaling day of the week`,
      score: 700 + maxWd,
      metadata: { count: maxWd, day: DAY_NAMES[maxWdIdx] },
    });
  }

  if (stats.nightPct >= 20) {
    candidates.push({
      id: "night-shift",
      category: "time",
      headline: `${stats.nightPct}% arrived after dark`,
      subline: "Between 10pm and 6am",
      score: 650 + stats.nightPct,
    });
  }

  const byHour = new Array(24).fill(0);
  for (const r of rows) {
    byHour[zonedParts(r.foaled_at, timeZone).hour]++;
  }
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const peakHourCount = byHour[peakHour];
  if (peakHourCount >= 4) {
    const label =
      peakHour === 0
        ? "midnight"
        : peakHour < 12
          ? `${peakHour}am`
          : peakHour === 12
            ? "12pm"
            : `${peakHour - 12}pm`;
    candidates.push({
      id: "peak-hour",
      category: "time",
      headline: `Peak hour: ${label}`,
      subline: `${peakHourCount} foals born in that hour`,
      score: 600 + peakHourCount,
    });
  }

  let busiestWeek = { count: 0, start: "", end: "" };
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const key = zonedParts(r.foaled_at, timeZone).dateKey;
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }
  const dateKeys = [...byDate.keys()].sort();
  for (let i = 0; i < dateKeys.length; i++) {
    let count = 0;
    const start = dateKeys[i];
    const startD = new Date(start);
    for (let j = 0; j < 7; j++) {
      const d = new Date(startD);
      d.setDate(d.getDate() + j);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      count += byDate.get(k) ?? 0;
    }
    if (count > busiestWeek.count) {
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + 6);
      busiestWeek = {
        count,
        start,
        end: `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`,
      };
    }
  }
  if (busiestWeek.count >= 4) {
    const fromIso = `${busiestWeek.start}T12:00:00Z`;
    const toIso = `${busiestWeek.end}T12:00:00Z`;
    candidates.push({
      id: "busiest-week",
      category: "volume",
      headline: `${busiestWeek.count} foals in seven days`,
      subline: formatShortRange(fromIso, toIso, timeZone),
      score: 720 + busiestWeek.count,
    });
  }

  let longestDry = 0;
  const sorted = [...rows].sort(
    (a, b) => new Date(a.foaled_at).getTime() - new Date(b.foaled_at).getTime(),
  );
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      (new Date(sorted[i].foaled_at).getTime() -
        new Date(sorted[i - 1].foaled_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (gap > longestDry) longestDry = Math.floor(gap);
  }
  if (longestDry >= 7) {
    candidates.push({
      id: "longest-quiet",
      category: "streak",
      headline: `${longestDry} days between foals`,
      subline: "Your longest quiet stretch",
      score: 500 + longestDry,
    });
  }

  if (stats.topSire && stats.topSireCount >= 3) {
    const topPct = pct(stats.topSireCount, stats.total);
    candidates.push({
      id: "top-sire",
      category: "sire",
      headline: `${stats.topSire} led the season`,
      subline: `${stats.topSireCount} foals · ${topPct}% of the crop`,
      score: 750 + stats.topSireCount,
    });
  }

  if (stats.uniqueSires >= 2) {
    candidates.push({
      id: "sire-diversity",
      category: "sire",
      headline: `${stats.uniqueSires} stallions represented`,
      subline: stats.topSire
        ? `${stats.topSire} stood out above the rest`
        : undefined,
      score: 550 + stats.uniqueSires * 5,
    });
  }

  if (stats.avgWeightKg != null && stats.weightRecordedCount >= 10) {
    candidates.push({
      id: "avg-weight",
      category: "weight",
      headline: `${stats.avgWeightKg} kg average`,
      subline: `Across ${stats.weightRecordedCount} recorded weights`,
      score: 680,
    });
  }

  if (
    stats.minWeightKg != null &&
    stats.maxWeightKg != null &&
    stats.maxWeightKg - stats.minWeightKg >= 5
  ) {
    candidates.push({
      id: "weight-range",
      category: "weight",
      headline: `${stats.minWeightKg}–${stats.maxWeightKg} kg`,
      subline: "Lightest to heaviest foal this season",
      score: 620,
    });
  }

  const coltWeights = rows
    .filter((r) => r.sex === "colt" && r.weight_kg != null)
    .map((r) => r.weight_kg!);
  const fillyWeights = rows
    .filter((r) => r.sex === "filly" && r.weight_kg != null)
    .map((r) => r.weight_kg!);
  if (coltWeights.length >= 8 && fillyWeights.length >= 8) {
    const coltAvg = round1(
      coltWeights.reduce((a, b) => a + b, 0) / coltWeights.length,
    );
    const fillyAvg = round1(
      fillyWeights.reduce((a, b) => a + b, 0) / fillyWeights.length,
    );
    const diff = Math.abs(coltAvg - fillyAvg);
    if (diff >= 0.5) {
      const heavier = coltAvg > fillyAvg ? "Colts" : "Fillies";
      candidates.push({
        id: "sex-weight",
        category: "weight",
        headline: `${heavier} averaged heavier`,
        subline: `Colts ${coltAvg} kg · Fillies ${fillyAvg} kg`,
        score: 640 + diff * 10,
      });
    }
  }

  if (stats.assistedPct != null && stats.assistedPct <= 15) {
    candidates.push({
      id: "assisted-low",
      category: "assisted",
      headline: `${stats.assistedPct}% assisted foalings`,
      subline: "Most arrivals were unassisted",
      score: 580,
    });
  }

  const byMonth = new Array(12).fill(0);
  for (const r of rows) {
    byMonth[zonedParts(r.foaled_at, timeZone).month - 1]++;
  }
  const peakMonth = byMonth.indexOf(Math.max(...byMonth));
  const peakMonthCount = byMonth[peakMonth];
  if (peakMonthCount >= 8) {
    candidates.push({
      id: "peak-month",
      category: "volume",
      headline: `${MONTH_NAMES[peakMonth]} was your peak`,
      subline: `${peakMonthCount} foals that month`,
      score: 660 + peakMonthCount,
    });
  }

  candidates.push({
    id: "hard-stats",
    category: "stats",
    headline: "The numbers",
    subline: `${stats.total} foals · ${stats.colts} colts · ${stats.fillies} fillies`,
    score: 100,
  });

  return candidates;
}

const CATEGORY_LIMITS: Partial<Record<string, number>> = {
  weekday: 1,
  time: 2,
  sire: 2,
  weight: 2,
  volume: 2,
  streak: 1,
  assisted: 1,
};

export function selectFactsForStory(
  candidates: WrappedFact[],
  maxStoryFacts = 11,
): WrappedFact[] {
  const title = candidates.find((c) => c.id === "title");
  const hardStats = candidates.find((c) => c.id === "hard-stats");
  const pool = candidates
    .filter((c) => c.category !== "title" && c.category !== "stats")
    .sort((a, b) => b.score - a.score);

  const picked: WrappedFact[] = [];
  const categoryCount = new Map<string, number>();

  for (const fact of pool) {
    if (picked.length >= maxStoryFacts) break;
    const limit = CATEGORY_LIMITS[fact.category] ?? 3;
    const used = categoryCount.get(fact.category) ?? 0;
    if (used >= limit) continue;
    picked.push(fact);
    categoryCount.set(fact.category, used + 1);
  }

  const result: WrappedFact[] = [];
  if (title) result.push(title);
  result.push(...picked);
  if (hardStats) result.push(hardStats);
  return result;
}

export function buildWrappedPayload(
  rows: FoalingRow[],
  seasonLabel: string,
  mediaUrls: string[],
  usingDemoData: boolean,
): WrappedPayload {
  const hardStats = computeHardStats(rows, seasonLabel);
  const candidates = buildCandidates(rows, seasonLabel, hardStats);
  const facts = selectFactsForStory(candidates);

  return {
    seasonLabel,
    facts,
    hardStats,
    mediaUrls,
    usingDemoData,
  };
}
