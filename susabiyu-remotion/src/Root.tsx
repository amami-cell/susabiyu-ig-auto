import { Composition } from "remotion";
import { SushiStory } from "./SushiStory";
import { SimpleStory } from "./SimpleStory";
import { PhotoStory } from "./PhotoStory";
import { TempoStory } from "./TempoStory";
import { TypoStory } from "./TypoStory";
import { photos } from "./photoData";
import { tempoPhotos } from "./tempoData";
import { typoPhotos } from "./typoData";

const FPS = 30;
const INTRO = 72;
const OUTRO = 72;
const SLIDE = 86;
const FADE = 16;
const T_INTRO = 48;
const T_PER = 22;
const T_OUTRO = 56;
const TY_TITLE = 72;
const TY_PER = 48;
const TY_OUTRO = 50;
const STORE = "すさび湯 河原町三条店";

export const RemotionRoot: React.FC = () => {
  const n = Math.max(photos.length, 1);
  const dur = INTRO + n * (SLIDE - FADE) + FADE + OUTRO;
  const nt = Math.max(tempoPhotos.length, 1);
  const tdur = T_INTRO + nt * T_PER + T_OUTRO;
  const ny = Math.max(typoPhotos.length, 1);
  const ydur = TY_TITLE + ny * TY_PER + TY_OUTRO;
  return (
    <>
      <Composition id="SushiStory" component={SushiStory} fps={FPS} width={1080} height={1920} durationInFrames={dur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="SimpleStory" component={SimpleStory} fps={FPS} width={1080} height={1920} durationInFrames={150} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="PhotoStory" component={PhotoStory} fps={FPS} width={1080} height={1920} durationInFrames={150} defaultProps={{ handle: "@susabiyu_sanjyo" }} />
      <Composition id="TempoStory" component={TempoStory} fps={FPS} width={1080} height={1920} durationInFrames={tdur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TypoStory" component={TypoStory} fps={FPS} width={1080} height={1920} durationInFrames={ydur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
    </>
  );
};
