"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const CSV_TEMPLATE = `foaled_at,sex,sire,weight_kg,dam,assisted
2025-02-15T03:24:00Z,colt,Galileo,52,Dam Name,false
2025-02-18T22:10:00Z,filly,Frankel,49,Another Dam,true
`;

type UploadPanelProps = {
  season: string;
};

export function UploadPanel({ season }: UploadPanelProps) {
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadCsv = async (file: File) => {
    setBusy(true);
    setCsvStatus(null);
    try {
      const text = await file.text();
      const res = await fetch(
        `/api/wrapped/${encodeURIComponent(season)}/foalings`,
        { method: "POST", body: text, headers: { "Content-Type": "text/csv" } },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setCsvStatus(`Inserted ${json.inserted} foaling records`);
    } catch (e) {
      setCsvStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadMedia = async (files: FileList) => {
    setBusy(true);
    setMediaStatus(null);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(
          `/api/wrapped/${encodeURIComponent(season)}/media`,
          { method: "POST", body: form },
        );
        if (res.ok) ok++;
      }
      setMediaStatus(`Uploaded ${ok} file(s)`);
    } catch (e) {
      setMediaStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foalings-${season}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const curateHref = `/wrapped/${encodeURIComponent(season)}/curate`;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Link
        href={curateHref}
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to curate
      </Link>

      <div>
        <h1 className="text-3xl font-black text-white">Upload · {season}</h1>
        <p className="mt-2 text-sm text-white/55">
          Requires Supabase env vars and storage buckets{" "}
          <code className="text-emerald-300">wrapped-media</code> and{" "}
          <code className="text-emerald-300">wrapped-audio</code>.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-emerald-400">
          <FileSpreadsheet className="h-5 w-5" />
          <h2 className="font-semibold text-white">Foaling CSV</h2>
        </div>
        <p className="mt-2 text-sm text-white/55">
          Columns: foaled_at, sex (colt/filly), sire, weight_kg, dam, assisted
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={downloadTemplate}
        >
          Download template
        </Button>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-8 hover:border-emerald-500/40">
          <Upload className="h-5 w-5 text-white/50" />
          <span className="text-sm text-white/70">Choose CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCsv(f);
            }}
          />
        </label>
        {csvStatus ? <p className="mt-3 text-sm text-white/60">{csvStatus}</p> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-violet-300">
          <ImageIcon className="h-5 w-5" />
          <h2 className="font-semibold text-white">Photos & video</h2>
        </div>
        <p className="mt-2 text-sm text-white/55">
          General season B-roll — not linked to individual foals.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-10 hover:border-violet-500/40">
          <Upload className="h-8 w-8 text-white/40" />
          <span className="text-sm text-white/70">Images or MP4/MOV video</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.length) uploadMedia(e.target.files);
            }}
          />
        </label>
        {mediaStatus ? (
          <p className="mt-3 text-sm text-white/60">{mediaStatus}</p>
        ) : null}
      </section>
    </div>
  );
}
