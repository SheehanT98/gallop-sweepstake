import { UploadPanel } from "@/components/upload/upload-panel";

type PageProps = {
  params: Promise<{ season: string }>;
};

export default async function UploadPage({ params }: PageProps) {
  const { season: raw } = await params;
  const season = decodeURIComponent(raw);

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-12">
      <UploadPanel season={season} />
    </main>
  );
}
