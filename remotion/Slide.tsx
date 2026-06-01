import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { WrappedFact } from "../src/lib/wrapped/types";
import { PALETTES } from "./theme";

type SlideProps = {
  fact: WrappedFact;
  bgUrl?: string;
  paletteIndex: number;
};

export const Slide: React.FC<SlideProps> = ({
  fact,
  bgUrl,
  paletteIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palette = PALETTES[paletteIndex % PALETTES.length];

  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 180 },
  });

  const headlineY = interpolate(enter, [0, 1], [48, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const scale = interpolate(enter, [0, 1], [0.92, 1]);

  const isTitle = fact.category === "title";
  const isBigNumber = fact.visual === "big-number";

  return (
    <AbsoluteFill>
      {bgUrl ? (
        <Img
          src={bgUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <AbsoluteFill style={{ backgroundColor: "#111" }} />
      )}
      <AbsoluteFill
        style={{
          background: palette.gradient,
          opacity: 0.92,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          padding: 64,
          transform: `translateY(${headlineY}px) scale(${scale})`,
          opacity,
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Prospect Foaling
        </p>
        <h1
          style={{
            color: "#fff",
            fontSize: isBigNumber ? 140 : isTitle ? 96 : 72,
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: -2,
            margin: 0,
          }}
        >
          {fact.headline}
        </h1>
        {fact.subline ? (
          <p
            style={{
              color: palette.accent,
              fontSize: 40,
              fontWeight: 600,
              marginTop: 32,
              lineHeight: 1.2,
              maxWidth: 900,
            }}
          >
            {fact.subline}
          </p>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
