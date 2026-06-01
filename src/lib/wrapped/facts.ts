import { buildTimeline } from "@/lib/wrapped/beats";
import type {
  FoalingRow,
  HardStats,
  MediaItem,
  WrappedAudioConfig,
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
  let weekendCount = 0;
  let assistedCount = 0;
  let assistedTotal = 0;
  for (const r of rows) {
    const { hour, weekday } = zonedParts(r.foaled_at, timeZone);
    if (hour >= 22 || hour < 6) nightCount++;
    if (weekday === 0 || weekday === 6) weekendCount++;
    if (r.assisted != null) {
      assistedTotal++;
      if (r.assisted) assistedCount++;
    }
  }

  let seasonWeeks = 1;
  if (sorted.length >= 2) {
    const ms =
      new Date(sorted.at(-1)!.foaled_at).getTime() -
      new Date(sorted[0].foaled_at).getTime();
    seasonWeeks = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24 * 7)));
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
    weekendPct: pct(weekendCount, total),
    avgPerWeek: round1(total / seasonWeeks),
  };
}

export function buildAllCandidates(
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
    headline: `${stats.total}`,
    subline: "foals born this season",
    score: 900,
    visual: "big-number",
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
      visual: "sex-bars",
      metadata: {
        colts: stats.colts,
        fillies: stats.fillies,
        coltPct: stats.coltPct,
        fillyPct: stats.fillyPct,
      },
    });
  }

  if (stats.avgPerWeek >= 1) {
    candidates.push({
      id: "pace",
      category: "volume",
      headline: `${stats.avgPerWeek} foals per week`,
      subline: "Average across the season",
      score: 640,
    });
  }

  const byWeekday = new Array(7).fill(0);
  for (const r of rows) {
    byWeekday[zonedParts(r.foaled_at, timeZone).weekday]++;
  }
  const maxWd = Math.max(...byWeekday);
  const maxWdIdx = byWeekday.indexOf(maxWd);
  if (maxWd >= 5) {
    const weekdayMeta: Record<string, number> = {};
    byWeekday.forEach((c, i) => {
      weekdayMeta[`d${i}`] = c;
    });
    candidates.push({
      id: "weekday-peak",
      category: "weekday",
      headline: `${maxWd} foals on ${DAY_NAMES[maxWdIdx]}s`,
      subline: "Your busiest foaling day of the week",
      score: 700 + maxWd,
      visual: "weekday-bars",
      metadata: { count: maxWd, day: DAY_NAMES[maxWdIdx], ...weekdayMeta },
    });
  }

  if (stats.weekendPct >= 25) {
    candidates.push({
      id: "weekend",
      category: "weekday",
      headline: `${stats.weekendPct}% on weekends`,
      subline: "Saturday and Sunday foalings",
      score: 600 + stats.weekendPct,
    });
  }

  if (stats.nightPct >= 20) {
    candidates.push({
      id: "night-shift",
      category: "time",
      headline: `${stats.nightPct}% after dark`,
      subline: "Born between 10pm and 6am",
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
      subline: `${peakHourCount} foals in that hour`,
      score: 600 + peakHourCount,
    });
  }

  const byDate = new Map<string, number>();
  for (const r of rows) {
    const key = zonedParts(r.foaled_at, timeZone).dateKey;
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }
  let busiestDay = { count: 0, key: "" };
  for (const [key, count] of byDate) {
    if (count > busiestDay.count) busiestDay = { count, key };
  }
  if (busiestDay.count >= 3) {
    const iso = `${busiestDay.key}T12:00:00Z`;
    candidates.push({
      id: "busiest-day",
      category: "volume",
      headline: `${busiestDay.count} foals in one day`,
      subline: formatDate(iso, timeZone),
      score: 710 + busiestDay.count,
    });
  }

  const multiDays = [...byDate.values()].filter((c) => c >= 2).length;
  if (multiDays >= 3) {
    candidates.push({
      id: "double-days",
      category: "volume",
      headline: `${multiDays} days with 2+ foals`,
      subline: "When the barn barely slept",
      score: 680 + multiDays,
    });
  }

  let busiestWeek = { count: 0, start: "", end: "" };
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
    candidates.push({
      id: "busiest-week",
      category: "volume",
      headline: `${busiestWeek.count} foals in seven days`,
      subline: formatShortRange(
        `${busiestWeek.start}T12:00:00Z`,
        `${busiestWeek.end}T12:00:00Z`,
        timeZone,
      ),
      score: 720 + busiestWeek.count,
    });
  }

  const sorted = [...rows].sort(
    (a, b) => new Date(a.foaled_at).getTime() - new Date(b.foaled_at).getTime(),
  );
  let longestDry = 0;
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
      headline: `${stats.uniqueSires} stallions`,
      subline: stats.topSire
        ? `${stats.topSire} stood out above the rest`
        : "Represented this season",
      score: 550 + stats.uniqueSires * 5,
    });
  }

  if (stats.topSire) {
    const sireWeights = rows
      .filter(
        (r) =>
          r.sire?.trim() === stats.topSire &&
          r.weight_kg != null &&
          !Number.isNaN(r.weight_kg),
      )
      .map((r) => r.weight_kg!);
    if (sireWeights.length >= 5) {
      const avg = round1(
        sireWeights.reduce((a, b) => a + b, 0) / sireWeights.length,
      );
      candidates.push({
        id: "top-sire-weight",
        category: "sire",
        headline: `${stats.topSire} foals averaged ${avg} kg`,
        subline: `From ${sireWeights.length} recorded weights`,
        score: 670,
      });
    }
  }

  if (stats.avgWeightKg != null && stats.weightRecordedCount >= 10) {
    candidates.push({
      id: "avg-weight",
      category: "weight",
      headline: `${stats.avgWeightKg} kg average`,
      subline: `${stats.weightRecordedCount} foals weighed`,
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
      subline: "Lightest to heaviest this season",
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
      headline: `${stats.assistedPct}% assisted`,
      subline: "Most arrivals were unassisted",
      score: 580,
    });
  }

  if (stats.assistedPct != null && stats.assistedPct >= 25) {
    candidates.push({
      id: "assisted-high",
      category: "assisted",
      headline: `${stats.assistedPct}% assisted`,
      subline: "The team was hands-on this season",
      score: 560,
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
      headline: `${MONTH_NAMES[peakMonth]} peaked`,
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
  weekday: 2,
  time: 2,
  sire: 3,
  weight: 2,
  volume: 3,
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

export function assembleStoryFromSelection(
  candidates: WrappedFact[],
  selectedIds: string[],
): WrappedFact[] {
  const title = candidates.find((c) => c.id === "title");
  const hardStats = candidates.find((c) => c.id === "hard-stats");
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const middle = selectedIds
    .map((id) => byId.get(id))
    .filter(
      (f): f is WrappedFact =>
        !!f && f.category !== "title" && f.category !== "stats",
    );

  const result: WrappedFact[] = [];
  if (title) result.push(title);
  result.push(...middle);
  if (hardStats) result.push(hardStats);
  return result.length > 1 ? result : selectFactsForStory(candidates);
}

export function buildWrappedPayload(
  rows: FoalingRow[],
  seasonLabel: string,
  media: MediaItem[],
  usingDemoData: boolean,
  selectedFactIds?: string[],
  audio?: WrappedAudioConfig | null,
): WrappedPayload {
  const hardStats = computeHardStats(rows, seasonLabel);
  const allCandidates = buildAllCandidates(rows, seasonLabel, hardStats);
  const facts = selectedFactIds?.length
    ? assembleStoryFromSelection(allCandidates, selectedFactIds)
    : selectFactsForStory(allCandidates);

  const mediaUrls = media.map((m) => m.url);
  const timeline = audio
    ? buildTimeline(facts, {
        trimStartSec: audio.trimStartSec,
        trimEndSec: audio.trimEndSec,
        bpm: audio.bpm,
        syncToBeat: audio.syncToBeat,
      })
    : buildTimeline(facts, null);

  return {
    seasonLabel,
    facts,
    allCandidates,
    hardStats,
    mediaUrls,
    media,
    audio: audio ?? null,
    timeline,
    usingDemoData,
  };
}
