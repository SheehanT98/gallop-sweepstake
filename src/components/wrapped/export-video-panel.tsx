"use client";

import { useState } from "react";
import { Download, Film, Loader2 } from "lucide-react";
import { getStoredFactIds } from "@/lib/wrapped/selection-storage";
import { getStoredAudioConfig } from "@/lib/wrapped/audio-storage";
import { Button } from "@/components/ui/button";

type ExportVideoPanelProps = {
  season: string;
};

export function ExportVideoPanel({ season }: ExportVideoPanelProps) {
  const [status, setStatus] = useState<"idle" | "rendering" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const exportVideo = async () => {
    setStatus("rendering");
    setMessage("Rendering video — this can take 1–3 minutes…");
    setDownloadUrl(null);

    const facts = getStoredFactIds(season);
    const audio = getStoredAudioConfig(season);

    try {
      const res = await fetch(
        `/api/wrapped/${encodeURIComponent(season)}/render`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            factIds: facts ?? undefined,
            audio: audio ?? undefined,
          }),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Render failed");
      }

      setStatus("done");
      setMessage(json.message ?? "Video ready");
      if (json.downloadUrl) setDownloadUrl(json.downloadUrl);
      if (json.base64) {
        const blob = Uint8Array.from(atob(json.base64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(
          new Blob([blob], { type: "video/mp4" }),
        );
        setDownloadUrl(url);
      }
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error
          ? e.message
          : "Render failed. Try npm run remotion:render locally.",
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-violet-300">
        <Film className="h-5 w-5" />
        <h2 className="text-sm font-bold uppercase tracking-wider">Export video</h2>
      </div>
      <p className="mt-3 text-sm text-white/55">
        Builds a 9:16 MP4 using your curated facts, backgrounds, and trimmed
        soundtrack with beat-synced cuts when enabled.
      </p>

      <Button
        type="button"
        variant="default"
        className="mt-4 w-full"
        onClick={exportVideo}
        disabled={status === "rendering"}
      >
        {status === "rendering" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Film className="h-5 w-5" />
        )}
        {status === "rendering" ? "Rendering…" : "Export MP4"}
      </Button>

      {message ? (
        <p
          className={`mt-3 text-sm ${status === "error" ? "text-rose-400" : "text-white/60"}`}
        >
          {message}
        </p>
      ) : null}

      {downloadUrl ? (
        <a
          href={downloadUrl}
          download={`foaling-wrapped-${season}.mp4`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15"
        >
          <Download className="h-4 w-4" />
          Download MP4
        </a>
      ) : null}
    </section>
  );
}
