import { AbsoluteFill, Series } from "remotion";
import type { WrappedPayload } from "../src/lib/wrapped/types";
import { Slide } from "./Slide";
import { StatsSlide } from "./StatsSlide";
import {
  FPS,
  OUTRO_SECONDS,
  SLIDE_SECONDS,
  STATS_SECONDS,
  TITLE_SECONDS,
} from "./theme";

export type WrappedVideoProps = {
  payload: WrappedPayload | null;
};

function secondsToFrames(s: number) {
  return Math.round(s * FPS);
}

export function computeDurationFrames(factCount: number): number {
  const storyFacts = Math.max(factCount - 2, 1);
  return (
    secondsToFrames(TITLE_SECONDS) +
    storyFacts * secondsToFrames(SLIDE_SECONDS) +
    secondsToFrames(STATS_SECONDS) +
    secondsToFrames(OUTRO_SECONDS)
  );
}

export const WRAPPED_DURATION_FRAMES = computeDurationFrames(13);

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

  const title = payload.facts.find((f) => f.category === "title");
  const statsFact = payload.facts.find((f) => f.category === "stats");
  const middle = payload.facts.filter(
    (f) => f.category !== "title" && f.category !== "stats",
  );

  let slideIndex = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {title ? (
          <Series.Sequence durationInFrames={secondsToFrames(TITLE_SECONDS)}>
            <Slide
              fact={title}
              bgUrl={payload.mediaUrls[0]}
              paletteIndex={0}
            />
          </Series.Sequence>
        ) : null}

        {middle.map((fact, i) => {
          slideIndex++;
          return (
            <Series.Sequence
              key={fact.id}
              durationInFrames={secondsToFrames(SLIDE_SECONDS)}
            >
              <Slide
                fact={fact}
                bgUrl={payload.mediaUrls[slideIndex % payload.mediaUrls.length]}
                paletteIndex={i + 1}
              />
            </Series.Sequence>
          );
        })}

        {statsFact ? (
          <Series.Sequence durationInFrames={secondsToFrames(STATS_SECONDS)}>
            <StatsSlide
              stats={payload.hardStats}
              bgUrl={
                payload.mediaUrls[
                  (slideIndex + 1) % payload.mediaUrls.length
                ]
              }
            />
          </Series.Sequence>
        ) : null}

        <Series.Sequence durationInFrames={secondsToFrames(OUTRO_SECONDS)}>
          <AbsoluteFill
            style={{
              background: "linear-gradient(180deg, #042f1a, #000)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <p
              style={{
                color: "#34d399",
                fontSize: 56,
                fontWeight: 900,
                margin: 0,
              }}
            >
              See you next season
            </p>
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
