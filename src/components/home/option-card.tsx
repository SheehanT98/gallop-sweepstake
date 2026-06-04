import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionCardProps = {
  href: string;
  title: string;
  description: string;
  accent: "emerald" | "amber";
  badge?: string;
  disabled?: boolean;
};

export function OptionCard({
  href,
  title,
  description,
  accent,
  badge,
  disabled,
}: OptionCardProps) {
  const accentRing =
    accent === "emerald"
      ? "from-emerald-500/30 via-emerald-400/10 to-transparent"
      : "from-amber-500/30 via-amber-400/10 to-transparent";

  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-white/25 hover:bg-white/10",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl",
          accentRing,
        )}
      />
      {badge ? (
        <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/70">
          {badge}
        </span>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-base text-white/65">{description}</p>
      {!disabled ? (
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition group-hover:gap-3">
          Open
          <ArrowRight className="h-4 w-4" />
        </span>
      ) : (
        <span className="mt-6 inline-block text-sm text-white/40">
          Coming soon
        </span>
      )}
    </div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
