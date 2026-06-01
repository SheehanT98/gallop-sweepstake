import type { FactCategory } from "@/lib/wrapped/types";

export const CATEGORY_GRADIENT: Record<FactCategory, string> = {
  title: "from-emerald-950/85 via-black/75 to-black",
  volume: "from-violet-950/80 via-black/75 to-black",
  sex: "from-rose-950/75 via-black/75 to-black",
  weekday: "from-sky-950/80 via-black/75 to-black",
  time: "from-indigo-950/85 via-black/75 to-black",
  streak: "from-zinc-900/90 via-black/80 to-black",
  sire: "from-amber-950/80 via-black/75 to-black",
  weight: "from-teal-950/80 via-black/75 to-black",
  assisted: "from-emerald-950/80 via-black/75 to-black",
  stats: "from-black/90 via-black/85 to-black",
};

export const CATEGORY_ACCENT: Record<FactCategory, string> = {
  title: "text-emerald-400",
  volume: "text-violet-300",
  sex: "text-rose-300",
  weekday: "text-sky-300",
  time: "text-indigo-300",
  streak: "text-zinc-300",
  sire: "text-amber-300",
  weight: "text-teal-300",
  assisted: "text-emerald-300",
  stats: "text-emerald-400",
};
