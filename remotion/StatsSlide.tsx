import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { HardStats } from "../src/lib/wrapped/types";
import { PALETTES } from "./theme";

type StatsSlideProps = {
  stats: HardStats;
  bgUrl?: string;
};

export const StatsSlide: React.FC<StatsSlideProps> = ({ stats, bgUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      {bgUrl ? (
        <Img
          src={bgUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background: PALETTES[0].gradient,
          padding: 64,
          justifyContent: "center",
          opacity,
        }}
      >
        <p
          style={{
            color: "#34d399",
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          The numbers
        </p>
        <p
          style={{
            color: "#fff",
            fontSize: 120,
            fontWeight: 900,
            margin: 0,
            lineHeight: 1,
          }}
        >
          {stats.total}
        </p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 36, marginTop: 8 }}>
          foals · {stats.seasonLabel}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 48,
          }}
        >
          <Box label="Colts" value={String(stats.colts)} sub={`${stats.coltPct}%`} />
          <Box label="Fillies" value={String(stats.fillies)} sub={`${stats.fillyPct}%`} />
          {stats.topSire ? (
            <Box
              label="Top sire"
              value={stats.topSire}
              sub={`${stats.topSireCount} foals`}
              wide
            />
          ) : null}
          {stats.avgWeightKg != null ? (
            <Box
              label="Avg weight"
              value={`${stats.avgWeightKg} kg`}
              sub={`${stats.weightRecordedCount} recorded`}
            />
          ) : null}
          <Box label="After dark" value={`${stats.nightPct}%`} sub="10pm–6am" />
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 28,
            marginTop: 40,
          }}
        >
          {stats.dateFrom} — {stats.dateTo}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

function Box({
  label,
  value,
  sub,
  wide,
}: {
  label: string;
  value: string;
  sub?: string;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.35)",
        borderRadius: 20,
        padding: 24,
        gridColumn: wide ? "span 2" : undefined,
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, margin: 0 }}>
        {label}
      </p>
      <p style={{ color: "#fff", fontSize: 36, fontWeight: 800, margin: "8px 0 0" }}>
        {value}
      </p>
      {sub ? (
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 24, margin: "4px 0 0" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}
