import { AbsoluteFill, Audio, Series } from "remotion";
import type { MediaItem, WrappedPayload } from "../src/lib/wrapped/types";
import { BackgroundMedia } from "./BackgroundMedia";
import { Slide } from "./Slide";
import { StatsSlide } from "./StatsSlide";
import { FPS, OUTRO_SECONDS } from "./theme";

export type WrappedVideoProps = {
  payload: WrappedPayload | null;
};

function secondsToFrames(s: number) {
  return Math.round(s * FPS);
}

export { computeDurationFramesFromTimeline } from "../src/lib/wrapped/video-duration";

export const WRAPPED_DURATION_FRAMES = secondsToFrames(60);

function pickMedia(payload: WrappedPayload, index: number): MediaItem | undefined {
  const list = payload.media.length ? payload.media : payload.mediaUrls.map((url) => ({ url, type: "image" as const }));
  return list[index % list.length];
}

export const WrappedVideo: React.FC<WrappedVideoProps> = ({ payload }) => {
  if (!payload) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          color: "#fff",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 48,
        }}
      >
        No payload
      </AbsoluteFill>
    );
  }

  const durations = payload.timeline?.slideDurationsSec ?? [];
  const defaultMiddle = 4;

  const sequences: { key: string; durationSec: number; content: React.ReactNode }[] = [];
  let mediaIndex = 0;

  for (let i = 0; i < payload.facts.length; i++) {
    const fact = payload.facts[i];
    const dur =
      durations[i] ??
      (fact.category === "title" ? 5 : fact.category === "stats" ? 9 : defaultMiddle);
    const media = pickMedia(payload, mediaIndex++);
    const isStats = fact.category === "stats";

    sequences.push({
      key: fact.id,
      durationSec: dur,
      content: isStats ? (
        <>
          <BackgroundMedia item={media} />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(165deg, rgba(4,47,26,0.92) 0%, rgba(0,0,0,0.88) 55%)",
            }}
          />
          <StatsSlide stats={payload.hardStats} bgUrl={media?.url} />
        </>
      ) : (
        <Slide fact={fact} media={media} paletteIndex={i} />
      ),
    });
  }

  const outroDur = durations[payload.facts.length] ?? OUTRO_SECONDS;
  sequences.push({
    key: "outro",
    durationSec: outroDur,
    content: (
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, #042f1a, #000)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p style={{ color: "#34d399", fontSize: 56, fontWeight: 900, margin: 0 }}>
          See you next season
        </p>
      </AbsoluteFill>
    ),
  });

  const audio = payload.audio;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {audio ? (
        <Audio
          src={audio.url}
          startFrom={secondsToFrames(audio.trimStartSec)}
          endAt={secondsToFrames(audio.trimEndSec)}
          volume={1}
        />
      ) : null}
      <Series>
        {sequences.map((seq) => (
          <Series.Sequence
            key={seq.key}
            durationInFrames={secondsToFrames(seq.durationSec)}
          >
            {seq.content}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
