import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ season: string }>;
};

/** Default entry for a season — send users to curate first */
export default async function WrappedSeasonPage({ params }: PageProps) {
  const { season: raw } = await params;
  redirect(`/wrapped/${encodeURIComponent(raw)}/curate`);
}
