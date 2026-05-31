import { Composition } from "remotion";
import { WrappedVideo, WRAPPED_DURATION_FRAMES } from "./WrappedVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FoalingWrapped"
        component={WrappedVideo}
        durationInFrames={WRAPPED_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          payload: null,
        }}
      />
    </>
  );
};
