export function getStoragePublicUrl(
  bucket: string,
  storagePath: string,
): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const encoded = storagePath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}

export function inferMediaType(path: string): "image" | "video" {
  const lower = path.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) return "video";
  return "image";
}

export function getMediaBucket() {
  return process.env.NEXT_PUBLIC_WRAPPED_MEDIA_BUCKET ?? "wrapped-media";
}

export function getAudioBucket() {
  return process.env.NEXT_PUBLIC_WRAPPED_AUDIO_BUCKET ?? "wrapped-audio";
}
