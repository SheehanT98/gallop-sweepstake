"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import type { WrappedFact, WrappedPayload } from "@/lib/wrapped/types";
import { CATEGORY_GRADIENT } from "@/lib/wrapped/category-styles";
import {
  BigNumberSlide,
  SexBarsSlide,
  StatsSlide,
  WeekdayBarsSlide,
} from "@/components/wrapped/slide-visuals";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLIDE_MS = 4500;

type WrappedStoryProps = {
  payload: WrappedPayload;
};

function pickBackground(urls: string[], index: number) {
  if (!urls.length) return undefined;
  return urls[index % urls.length];
}

function FactSlide({ fact }: { fact: WrappedFact }) {
  if (fact.visual === "big-number") {
    return <BigNumberSlide fact={fact} />;
  }
  if (fact.visual === "sex-bars") {
    return <SexBarsSlide fact={fact} />;
  }
  if (fact.visual === "weekday-bars") {
    return <WeekdayBarsSlide fact={fact} />;
  }

  const isTitle = fact.category === "title";
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.p
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "font-black leading-[0.92] tracking-tighter text-white",
          isTitle ? "text-5xl sm:text-7xl" : "text-4xl sm:text-6xl",
        )}
      >
        {fact.headline}
      </motion.p>
      {fact.subline ? (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="mt-5 max-w-md text-lg font-medium leading-snug text-white/75 sm:text-xl"
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
  const [finished, setFinished] = useState(false);

  const current = slides[index];
  const isStats = current?.category === "stats";
  const isLast = index === slides.length - 1;
  const bg = pickBackground(payload.mediaUrls, index);
  const gradient =
    CATEGORY_GRADIENT[current?.category ?? "title"] ??
    CATEGORY_GRADIENT.title;

  const next = useCallback(() => {
    if (index >= slides.length - 1) {
      setFinished(true);
      setPlaying(false);
      return;
    }
    setIndex((i) => i + 1);
    if (index + 1 >= slides.length - 1) {
      setFinished(true);
    }
  }, [index, slides.length]);

  const prev = useCallback(() => {
    setFinished(false);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const replay = () => {
    setIndex(0);
    setFinished(false);
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing || finished) return;
    const t = setInterval(next, SLIDE_MS);
    return () => clearInterval(t);
  }, [playing, finished, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const share = async () => {
    const text = `Prospect Foaling Wrapped ${payload.seasonLabel}: ${payload.hardStats.total} foals (${payload.hardStats.colts} colts, ${payload.hardStats.fillies} fillies)`;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Foaling Wrapped", text, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  const curateHref = `/wrapped/${encodeURIComponent(payload.seasonLabel)}/curate`;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col overflow-hidden bg-black">
      <div className="absolute inset-x-0 top-0 z-30 flex gap-1 p-3 pt-4 safe-top">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setFinished(false);
              setIndex(i);
            }}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
            aria-label={`Go to slide ${i + 1}`}
          >
            <div
              key={i === index && playing ? `active-${index}` : `idle-${i}`}
              className={cn(
                "h-full bg-white",
                i < index && "w-full",
                i > index && "w-0",
                i === index && playing && !finished && "animate-story-progress w-0",
                (i === index && (!playing || finished)) && "w-full",
              )}
              style={
                i === index && playing && !finished
                  ? { animationDuration: `${SLIDE_MS}ms` }
                  : undefined
              }
            />
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${index}-${bg}`}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65 }}
          className="absolute inset-0"
        >
          {bg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bg}
              alt=""
              className="ken-burns h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-zinc-900" />
          )}
          <div
            className={cn("absolute inset-0 bg-gradient-to-b", gradient)}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />
          <div className="film-grain pointer-events-none absolute inset-0 opacity-[0.12]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-20 flex flex-1 flex-col px-6 pb-28 pt-16">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Prospect Foaling
            {payload.usingDemoData ? " · demo" : ""}
          </p>
          <Link
            href={curateHref}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur hover:bg-white/20"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Edit
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center py-6">
          <AnimatePresence mode="wait">
            {finished && isLast ? (
              <motion.div
                key="end"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6 text-center"
              >
                <p className="text-3xl font-black text-white">That&apos;s a wrap</p>
                <p className="max-w-xs text-white/60">
                  {payload.hardStats.total} foals · {payload.seasonLabel}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="default" onClick={replay}>
                    <RotateCcw className="h-4 w-4" />
                    Replay
                  </Button>
                  <Button variant="secondary" onClick={share}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
                <Link
                  href="/wrapped"
                  className="text-sm text-white/50 hover:text-white"
                >
                  Back to seasons
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key={current?.id ?? index}
                initial={{ opacity: 0, x: 36, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -36, filter: "blur(4px)" }}
                transition={{ duration: 0.38 }}
                className="min-h-[220px]"
              >
                {isStats && current ? (
                  <StatsSlide stats={payload.hardStats} />
                ) : current ? (
                  <FactSlide fact={current} />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!finished || !isLast ? (
        <>
          <div className="absolute inset-0 z-10 grid grid-cols-[38%_62%]">
            <button
              type="button"
              className="h-full w-full cursor-w-resize"
              onClick={prev}
              aria-label="Previous"
            />
            <button
              type="button"
              className="h-full w-full cursor-e-resize"
              onClick={next}
              aria-label="Next"
            />
          </div>

          <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center gap-6 px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="bg-black/40 backdrop-blur"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setPlaying((p) => !p)}
              className="bg-black/40 backdrop-blur"
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
              className="bg-black/40 backdrop-blur"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
