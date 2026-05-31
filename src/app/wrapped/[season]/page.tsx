import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWrappedForSeason } from "@/lib/wrapped/data";
import { WrappedStory } from "@/components/wrapped/wrapped-story";

type PageProps = {
  params: Promise<{ season: string }>;
};

export default async function WrappedSeasonPage({ params }: PageProps) {
  const { season: raw } = await params;
  const season = decodeURIComponent(raw);
  const payload = await getWrappedForSeason(season);

  return (
    <div className="min-h-screen bg-black">
      <Link
        href="/wrapped"
        className="fixed left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm text-white/80 backdrop-blur hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Seasons
      </Link>
      <WrappedStory payload={payload} />
    </div>
  );
}
