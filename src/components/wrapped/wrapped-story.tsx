"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HardStats, WrappedFact, WrappedPayload } from "@/lib/wrapped/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLIDE_MS = 4000;

type WrappedStoryProps = {
  payload: WrappedPayload;
};

function pickBackground(urls: string[], index: number) {
  if (!urls.length) return undefined;
  return urls[index % urls.length];
}

function StatsSlide({ stats }: { stats: HardStats }) {
  return (
    <div className="flex h-full flex-col justify-center gap-6 px-2">
      <p className="text-5xl font-black leading-none tracking-tighter text-white sm:text-6xl">
        {stats.total}
      </p>
      <p className="text-lg font-medium text-white/80">foals this season</p>
      <div className="grid grid-cols-2 gap-4 text-left">
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
        <StatBlock label="Night foalings" value={`${stats.nightPct}%`} sub="10pm–6am" />
      </div>
      <p className="text-sm text-white/50">
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
    <div className={cn("rounded-2xl bg-black/30 p-4", className)}>
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {sub ? <p className="text-sm text-white/60">{sub}</p> : null}
    </div>
  );
}

function FactSlide({ fact }: { fact: WrappedFact }) {
  const isTitle = fact.category === "title";
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.p
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "font-black leading-[0.95] tracking-tighter text-white",
          isTitle ? "text-5xl sm:text-7xl" : "text-4xl sm:text-6xl",
        )}
      >
        {fact.headline}
      </motion.p>
      {fact.subline ? (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-4 max-w-md text-lg font-medium text-white/75 sm:text-xl"
        >
          {fact.subline}
        </motion.p>
      ) : null}
    </div>
  );
}

export function WrappedStory({ payload }: WrappedStoryProps) {
  const slides = payload.facts;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const current = slides[index];
  const isStats = current?.category === "stats";
  const bg = pickBackground(payload.mediaUrls, index);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(next, SLIDE_MS);
    return () => clearInterval(t);
  }, [playing, next]);

  const palette = index % 3;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-black">
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-4">
        {slides.map((_, i) => (
          <div
            key={i}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className={cn(
                "h-full bg-white transition-all duration-300",
                i < index && "w-full",
                i > index && "w-0",
                i === index && playing && "animate-story-progress",
                i === index && !playing && "w-full",
              )}
              style={
                i === index && playing
                  ? { animationDuration: `${SLIDE_MS}ms` }
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${index}-${bg}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {bg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bg}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-zinc-900" />
          )}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-b",
              palette === 0 && "from-emerald-950/80 via-black/70 to-black",
              palette === 1 && "from-amber-950/70 via-black/75 to-black",
              palette === 2 && "from-teal-950/80 via-black/70 to-black",
            )}
          />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex flex-1 flex-col px-6 pb-8 pt-14">
        <p className="text-xs font-medium uppercase tracking-widest text-white/50">
          Prospect Foaling · {payload.seasonLabel}
          {payload.usingDemoData ? " · demo data" : ""}
        </p>

        <div className="flex flex-1 flex-col justify-center py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id ?? index}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="min-h-[200px]"
            >
              {isStats && current ? (
                <StatsSlide stats={payload.hardStats} />
              ) : current ? (
                <FactSlide fact={current} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <button
        type="button"
        className="absolute inset-0 z-[5] grid grid-cols-2"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 2) prev();
          else next();
        }}
        aria-hidden
      />
    </div>
  );
}
