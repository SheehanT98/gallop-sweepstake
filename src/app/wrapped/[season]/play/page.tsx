import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWrappedForSeason } from "@/lib/wrapped/data";
import { WrappedStoryLoader } from "@/components/wrapped/wrapped-story-loader";

type PageProps = {
  params: Promise<{ season: string }>;
};

export default async function WrappedPlayPage({ params }: PageProps) {
  const { season: raw } = await params;
  const season = decodeURIComponent(raw);
  const payload = await getWrappedForSeason(season);

  return (
    <div className="min-h-screen bg-black">
      <Link
        href={`/wrapped/${encodeURIComponent(season)}/curate`}
        className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-sm text-white/80 backdrop-blur-md hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Curate
      </Link>
      <WrappedStoryLoader season={season} initialPayload={payload} />
    </div>
  );
}
