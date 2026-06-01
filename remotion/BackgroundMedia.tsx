import { AbsoluteFill, Img, OffthreadVideo } from "remotion";
import type { MediaItem } from "../src/lib/wrapped/types";

type BackgroundMediaProps = {
  item?: MediaItem;
  fallbackUrl?: string;
};

export const BackgroundMedia: React.FC<BackgroundMediaProps> = ({
  item,
  fallbackUrl,
}) => {
  const url = item?.url ?? fallbackUrl;
  const type = item?.type ?? "image";

  if (!url) {
    return <AbsoluteFill style={{ backgroundColor: "#111" }} />;
  }

  if (type === "video") {
    return (
      <AbsoluteFill>
        <OffthreadVideo
          src={url}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
          volume={0}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <Img
        src={url}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};
