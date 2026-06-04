export type FoalingRow = {
  id: string;
  foaled_at: string;
  sex: "colt" | "filly";
  sire: string | null;
  weight_kg: number | null;
  dam: string | null;
  assisted: boolean | null;
  season_label: string;
};

export type FactCategory =
  | "title"
  | "volume"
  | "sex"
  | "weekday"
  | "time"
  | "streak"
  | "sire"
  | "weight"
  | "assisted"
  | "stats";

export type FactVisual =
  | "default"
  | "big-number"
  | "sex-bars"
  | "weekday-bars";

export type WrappedFact = {
  id: string;
  category: FactCategory;
  headline: string;
  subline?: string;
  score: number;
  visual?: FactVisual;
  metadata?: Record<string, string | number>;
};

export type HardStats = {
  total: number;
  colts: number;
  fillies: number;
  coltPct: number;
  fillyPct: number;
  seasonLabel: string;
  dateFrom: string;
  dateTo: string;
  topSire: string | null;
  topSireCount: number;
  uniqueSires: number;
  avgWeightKg: number | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  weightRecordedCount: number;
  nightPct: number;
  assistedPct: number | null;
  weekendPct: number;
  avgPerWeek: number;
};

export type MediaItem = {
  url: string;
  type: "image" | "video";
};

export type WrappedAudioConfig = {
  url: string;
  trimStartSec: number;
  trimEndSec: number;
  durationSec: number;
  bpm: number;
  syncToBeat: boolean;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  trackTitle: string | null;
  artist: string | null;
};

export type WrappedTimeline = {
  slideDurationsSec: number[];
  totalSec: number;
  beatIntervalSec: number;
};

export type WrappedPayload = {
  seasonLabel: string;
  facts: WrappedFact[];
  allCandidates: WrappedFact[];
  hardStats: HardStats;
  /** @deprecated use media */
  mediaUrls: string[];
  media: MediaItem[];
  audio: WrappedAudioConfig | null;
  timeline: WrappedTimeline | null;
  usingDemoData: boolean;
};

export type SeasonPreview = {
  seasonLabel: string;
  total: number;
  colts: number;
  fillies: number;
  usingDemoData: boolean;
};

export type MusicReference = {
  platform: "spotify" | "apple" | null;
  url: string;
  trackTitle: string | null;
  artist: string | null;
};
