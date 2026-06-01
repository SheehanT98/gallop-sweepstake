import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWrappedForSeason } from "@/lib/wrapped/data";
import { FactCurator } from "@/components/wrapped/fact-curator";

type PageProps = {
  params: Promise<{ season: string }>;
};

export default async function WrappedCuratePage({ params }: PageProps) {
  const { season: raw } = await params;
  const season = decodeURIComponent(raw);
  const payload = await getWrappedForSeason(season);

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-12 pb-24">
      <Link
        href="/wrapped"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Seasons
      </Link>
      <div className="mt-10">
        <FactCurator payload={payload} />
      </div>
    </main>
  );
}
