import { Composition } from "remotion";
import { Ad, AD_FRAMES, FPS } from "./Ad";
import { Hype, HYPE_FRAMES } from "./hype/Hype";

export const RemotionRoot = () => (
  <>
    <Composition id="DeskkeepAd" component={Ad} durationInFrames={AD_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="DeskkeepHype" component={Hype} durationInFrames={HYPE_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
