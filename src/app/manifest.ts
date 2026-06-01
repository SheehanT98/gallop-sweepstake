import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gallop · Prospect Foaling",
    short_name: "Gallop",
    description: "Foaling Wrapped and farm tools",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#10b981",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
