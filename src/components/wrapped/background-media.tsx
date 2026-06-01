"use client";

import { useEffect, useRef } from "react";
import type { MediaItem } from "@/lib/wrapped/types";
import { cn } from "@/lib/utils";

type BackgroundMediaProps = {
  item?: MediaItem;
  className?: string;
};

export function BackgroundMedia({ item, className }: BackgroundMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || item?.type !== "video") return;
    v.play().catch(() => {});
  }, [item?.url, item?.type]);

  if (!item?.url) {
    return <div className={cn("h-full w-full bg-zinc-900", className)} />;
  }

  if (item.type === "video") {
    return (
      <video
        ref={videoRef}
        src={item.url}
        className={cn("ken-burns h-full w-full object-cover", className)}
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt=""
      className={cn("ken-burns h-full w-full object-cover", className)}
    />
  );
}
