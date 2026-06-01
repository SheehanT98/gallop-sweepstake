import Link from "next/link";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import type { SeasonPreview } from "@/lib/wrapped/types";

export function SeasonCard({ preview }: { preview: SeasonPreview }) {
  const href = `/wrapped/${encodeURIComponent(preview.seasonLabel)}`;
  const curateHref = `${href}/curate`;

  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-emerald-500/35 hover:bg-white/[0.07]">
      <div className="border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-black text-white">{preview.seasonLabel}</p>
            <p className="mt-1 text-sm text-white/55">
              {preview.total} foals · {preview.colts} colts · {preview.fillies}{" "}
              fillies
            </p>
          </div>
          {preview.usingDemoData ? (
            <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Demo
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="bg-emerald-400"
            style={{
              width: `${preview.total ? (preview.colts / preview.total) * 100 : 50}%`,
            }}
          />
          <div
            className="bg-amber-400"
            style={{
              width: `${preview.total ? (preview.fillies / preview.total) * 100 : 50}%`,
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 text-sm font-semibold">
        <Link
          href={`${href}/upload`}
          className="flex items-center justify-center py-3.5 text-white/55 transition hover:bg-white/5 hover:text-white"
        >
          Upload
        </Link>
        <Link
          href={curateHref}
          className="flex items-center justify-center gap-1.5 border-x border-white/10 py-3.5 text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Curate
        </Link>
        <Link
          href={`${href}/play`}
          className="flex items-center justify-center gap-1.5 bg-emerald-500/15 py-3.5 text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <Sparkles className="h-4 w-4" />
          Play
        </Link>
      </div>
    </li>
  );
}
