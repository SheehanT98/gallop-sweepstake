"use client";

import { useCallback, useEffect, useState } from "react";
import { Music2, Sparkles, Upload } from "lucide-react";
import type { WrappedAudioConfig } from "@/lib/wrapped/types";
import {
  estimateBpmFromFile,
  getAudioDurationSec,
} from "@/lib/wrapped/audio-analysis";
import { parseMusicReference } from "@/lib/wrapped/music-links";
import { setStoredAudioConfig } from "@/lib/wrapped/audio-storage";
import { Button } from "@/components/ui/button";

type AudioEditorProps = {
  season: string;
  initial: WrappedAudioConfig | null;
  onChange: (config: WrappedAudioConfig | null) => void;
};

export function AudioEditor({ season, initial, onChange }: AudioEditorProps) {
  const [config, setConfig] = useState<WrappedAudioConfig | null>(initial);
  const [musicLink, setMusicLink] = useState(
    initial?.spotifyUrl ?? initial?.appleMusicUrl ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  const persist = useCallback(
    (next: WrappedAudioConfig | null) => {
      setConfig(next);
      setStoredAudioConfig(season, next);
      onChange(next);
    },
    [season, onChange],
  );

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const duration = await getAudioDurationSec(file);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/wrapped/${encodeURIComponent(season)}/audio`,
        { method: "POST", body: form },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const next: WrappedAudioConfig = {
        url: json.url,
        trimStartSec: 0,
        trimEndSec: Math.min(60, duration),
        durationSec: duration,
        bpm: 120,
        syncToBeat: true,
        spotifyUrl: config?.spotifyUrl ?? null,
        appleMusicUrl: config?.appleMusicUrl ?? null,
        trackTitle: config?.trackTitle ?? file.name.replace(/\.[^.]+$/, ""),
        artist: config?.artist ?? null,
      };
      persist(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const detectBpm = async () => {
    if (!config?.url) return;
    setDetecting(true);
    try {
      const res = await fetch(config.url);
      const blob = await res.blob();
      const file = new File([blob], "audio.mp3", { type: blob.type });
      const bpm = await estimateBpmFromFile(file);
      persist({ ...config, bpm });
    } finally {
      setDetecting(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setError(null);
    const res = await fetch(
      `/api/wrapped/${encodeURIComponent(season)}/audio-config`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trimStartSec: config.trimStartSec,
          trimEndSec: config.trimEndSec,
          bpm: config.bpm,
          syncToBeat: config.syncToBeat,
          spotifyUrl: config.spotifyUrl,
          appleMusicUrl: config.appleMusicUrl,
          trackTitle: config.trackTitle,
          artist: config.artist,
        }),
      },
    );
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Could not save");
      return;
    }
    persist(config);
  };

  const applyMusicLink = () => {
    const ref = parseMusicReference(musicLink);
    if (!ref) {
      setError("Paste a valid Spotify or Apple Music track link");
      return;
    }
    setError(null);
    const patch: Partial<WrappedAudioConfig> = {
      spotifyUrl: ref.platform === "spotify" ? ref.url : config?.spotifyUrl ?? null,
      appleMusicUrl:
        ref.platform === "apple" ? ref.url : config?.appleMusicUrl ?? null,
    };
    if (config) persist({ ...config, ...patch });
    else
      setConfig({
        url: "",
        trimStartSec: 0,
        trimEndSec: 60,
        durationSec: 60,
        bpm: 120,
        syncToBeat: true,
        trackTitle: ref.trackTitle,
        artist: ref.artist,
        spotifyUrl: patch.spotifyUrl ?? null,
        appleMusicUrl: patch.appleMusicUrl ?? null,
      });
  };

  const maxEnd = config?.durationSec ?? 120;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-emerald-400">
        <Music2 className="h-5 w-5" />
        <h2 className="text-sm font-bold uppercase tracking-wider">Soundtrack</h2>
      </div>

      <p className="mt-3 text-sm text-white/55">
        Spotify and Apple Music links are for reference only — upload an MP3/M4A
        you have rights to use in the exported video (same idea as Instagram:
        pick the hook, trim the drop).
      </p>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-white/45">Streaming link (optional)</span>
        <div className="mt-1 flex gap-2">
          <input
            type="url"
            value={musicLink}
            onChange={(e) => setMusicLink(e.target.value)}
            placeholder="https://open.spotify.com/track/…"
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30"
          />
          <Button type="button" variant="secondary" onClick={applyMusicLink}>
            Link
          </Button>
        </div>
      </label>

      <div className="mt-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-8 transition hover:border-emerald-500/40">
          <Upload className="h-8 w-8 text-white/40" />
          <span className="mt-2 text-sm font-medium text-white/70">
            {uploading ? "Uploading…" : "Upload audio (MP3, M4A, WAV)"}
          </span>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
            }}
          />
        </label>
      </div>

      {config?.url ? (
        <div className="mt-6 space-y-5">
          <audio src={config.url} controls className="w-full" preload="metadata" />

          <div>
            <div className="flex justify-between text-xs text-white/50">
              <span>Trim start · {config.trimStartSec.toFixed(1)}s</span>
              <span>End · {config.trimEndSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxEnd - 5}
              step={0.5}
              value={config.trimStartSec}
              onChange={(e) =>
                persist({
                  ...config,
                  trimStartSec: Number(e.target.value),
                })
              }
              className="mt-2 w-full accent-emerald-500"
            />
            <input
              type="range"
              min={config.trimStartSec + 5}
              max={maxEnd}
              step={0.5}
              value={config.trimEndSec}
              onChange={(e) =>
                persist({
                  ...config,
                  trimEndSec: Number(e.target.value),
                })
              }
              className="mt-2 w-full accent-emerald-500"
            />
            <p className="mt-2 text-xs text-white/40">
              Clip length: {(config.trimEndSec - config.trimStartSec).toFixed(1)}s
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-white/45">BPM</span>
              <input
                type="number"
                min={60}
                max={180}
                value={config.bpm}
                onChange={(e) =>
                  persist({ ...config, bpm: Number(e.target.value) || 120 })
                }
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={detectBpm}
                disabled={detecting}
              >
                <Sparkles className="h-4 w-4" />
                {detecting ? "Detecting…" : "Auto BPM"}
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={config.syncToBeat}
              onChange={(e) =>
                persist({ ...config, syncToBeat: e.target.checked })
              }
              className="accent-emerald-500"
            />
            Sync slide cuts to beat grid
          </label>

          <Button type="button" variant="default" className="w-full" onClick={saveConfig}>
            Save soundtrack settings
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </section>
  );
}
