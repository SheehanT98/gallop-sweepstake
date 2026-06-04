"use client";

import { motion } from "framer-motion";
import type { HardStats, WrappedFact } from "@/lib/wrapped/types";
import { cn } from "@/lib/utils";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BigNumberSlide({ fact }: { fact: WrappedFact }) {
  return (
    <div className="flex flex-col justify-center">
      <motion.p
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-gradient-to-br from-white to-emerald-200/90 bg-clip-text text-[7rem] font-black leading-none tracking-tighter text-transparent sm:text-[8.5rem]"
      >
        {fact.headline}
      </motion.p>
      {fact.subline ? (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-2 text-2xl font-semibold text-white/80"
        >
          {fact.subline}
        </motion.p>
      ) : null}
    </div>
  );
}

export function SexBarsSlide({ fact }: { fact: WrappedFact }) {
  const coltPct = Number(fact.metadata?.coltPct ?? 50);
  const fillyPct = Number(fact.metadata?.fillyPct ?? 50);
  const colts = Number(fact.metadata?.colts ?? 0);
  const fillies = Number(fact.metadata?.fillies ?? 0);

  return (
    <div className="flex flex-col justify-center gap-8">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-black tracking-tight text-white sm:text-5xl"
      >
        {fact.headline}
      </motion.p>
      <div className="space-y-4">
        <BarRow label="Colts" count={colts} pct={coltPct} color="bg-emerald-400" />
        <BarRow label="Fillies" count={fillies} pct={fillyPct} color="bg-amber-400" />
      </div>
      {fact.subline ? (
        <p className="text-lg text-white/70">{fact.subline}</p>
      ) : null}
    </div>
  );
}

function BarRow({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-medium text-white/70">
        <span>{label}</span>
        <span>
          {count} · {pct}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/15">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

export function WeekdayBarsSlide({ fact }: { fact: WrappedFact }) {
  const counts = DAY_SHORT.map((_, i) =>
    Number(fact.metadata?.[`d${i}`] ?? 0),
  );
  const max = Math.max(...counts, 1);

  return (
    <div className="flex flex-col justify-center gap-6">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-black tracking-tight text-white sm:text-5xl"
      >
        {fact.headline}
      </motion.p>
      <div className="flex h-36 items-end justify-between gap-1.5">
        {DAY_SHORT.map((day, i) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(counts[i] / max) * 100}%` }}
              transition={{
                duration: 0.6,
                delay: 0.05 * i,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full min-h-[4px] rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-300"
            />
            <span className="text-[10px] font-medium uppercase text-white/50">
              {day}
            </span>
          </div>
        ))}
      </div>
      {fact.subline ? (
        <p className="text-lg text-white/70">{fact.subline}</p>
      ) : null}
    </div>
  );
}

export function StatsSlide({ stats }: { stats: HardStats }) {
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-400"
      >
        The numbers
      </motion.p>
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-6xl font-black leading-none tracking-tighter text-white sm:text-7xl"
      >
        {stats.total}
      </motion.p>
      <p className="text-lg font-medium text-white/75">foals · {stats.seasonLabel}</p>
      <div className="grid grid-cols-2 gap-3 text-left">
        <StatBlock label="Colts" value={`${stats.colts}`} sub={`${stats.coltPct}%`} />
        <StatBlock label="Fillies" value={`${stats.fillies}`} sub={`${stats.fillyPct}%`} />
        {stats.topSire ? (
          <StatBlock
            label="Top sire"
            value={stats.topSire}
            sub={`${stats.topSireCount} foals`}
            className="col-span-2"
          />
        ) : null}
        {stats.avgWeightKg != null ? (
          <StatBlock
            label="Avg weight"
            value={`${stats.avgWeightKg} kg`}
            sub={`${stats.weightRecordedCount} recorded`}
          />
        ) : null}
        <StatBlock label="After dark" value={`${stats.nightPct}%`} sub="10pm–6am" />
        <StatBlock
          label="Per week"
          value={`${stats.avgPerWeek}`}
          sub="season average"
        />
      </div>
      <p className="text-sm text-white/45">
        {stats.dateFrom} — {stats.dateTo}
      </p>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-black/35 p-3.5", className)}>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      {sub ? <p className="text-xs text-white/55">{sub}</p> : null}
    </div>
  );
}
