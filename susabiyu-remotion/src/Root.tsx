import { Composition } from "remotion";
import { SushiStory } from "./SushiStory";
import { SimpleStory } from "./SimpleStory";
import { PhotoStory } from "./PhotoStory";
import { TempoStory } from "./TempoStory";
import { TypoStory } from "./TypoStory";
import { OshinaStory } from "./OshinaStory";
import { OshinaTate } from "./OshinaTate";
import { KaitenStory, KAITEN_DUR } from "./KaitenStory";
import { OsusumeStory, OSUSUME_DUR } from "./OsusumeStory";
import { GridZoom, GRIDZOOM_DUR } from "./GridZoom";
import { NorenStory, NOREN_DUR } from "./NorenStory";
import { SeasonStory, SEASON_DUR } from "./SeasonStory";
import { CapDelicious, CAP1_DUR } from "./CapDelicious";
import { CapOpen, CAP2_DUR } from "./CapOpen";
import { CapMenu, CAP3_DUR } from "./CapMenu";
import { CapPromo, CAP4_DUR } from "./CapPromo";
import { CapRec, CAP5_DUR } from "./CapRec";
import { CapStory, CAP6_DUR } from "./CapStory";
import { TaishuFuda, TFUDA_DUR } from "./TaishuFuda";
import { TaishuKakegoe, TKOE_DUR } from "./TaishuKakegoe";
import { TaishuNigi, TNIGI_DUR } from "./TaishuNigi";
import { TaishuKaiten, TKAI_DUR } from "./TaishuKaiten";
import { TaishuOshi, TOSHI_DUR } from "./TaishuOshi";
import { TaishuOdo } from "./TaishuOdo";
import { TaishuZen } from "./TaishuZen";
import { TaishuShinbun, TSHIN_DUR } from "./TaishuShinbun";
import { TaishuGrid, TGRID_DUR } from "./TaishuGrid";
import { TaishuTanzaku, TTAN_DUR } from "./TaishuTanzaku";
import { TaishuAkanoren, TANOREN_DUR } from "./TaishuAkanoren";
import { TaishuGaku } from "./TaishuGaku";
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
  const oshDur = 50 + ny * 88 + 120;   // OshinaStory: INTRO + N*PER + FINALE
  const oshtDur = 42 + ny * 50 + 96;   // OshinaTate(縦書き): INTRO + N*STEP + HOLD
  return (
    <>
      <Composition id="SushiStory" component={SushiStory} fps={FPS} width={1080} height={1920} durationInFrames={dur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="SimpleStory" component={SimpleStory} fps={FPS} width={1080} height={1920} durationInFrames={150} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="PhotoStory" component={PhotoStory} fps={FPS} width={1080} height={1920} durationInFrames={150} defaultProps={{ handle: "@susabiyu_sanjyo" }} />
      <Composition id="TempoStory" component={TempoStory} fps={FPS} width={1080} height={1920} durationInFrames={tdur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TypoStory" component={TypoStory} fps={FPS} width={1080} height={1920} durationInFrames={ydur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="OshinaStory" component={OshinaStory} fps={FPS} width={1080} height={1920} durationInFrames={oshDur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="OshinaTate" component={OshinaTate} fps={FPS} width={1080} height={1920} durationInFrames={oshtDur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="KaitenStory" component={KaitenStory} fps={FPS} width={1080} height={1920} durationInFrames={KAITEN_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="OsusumeStory" component={OsusumeStory} fps={FPS} width={1080} height={1920} durationInFrames={OSUSUME_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="GridZoom" component={GridZoom} fps={FPS} width={1080} height={1920} durationInFrames={GRIDZOOM_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="NorenStory" component={NorenStory} fps={FPS} width={1080} height={1920} durationInFrames={NOREN_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="SeasonStory" component={SeasonStory} fps={FPS} width={1080} height={1920} durationInFrames={SEASON_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="CapDelicious" component={CapDelicious} fps={FPS} width={1080} height={1920} durationInFrames={CAP1_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="CapOpen" component={CapOpen} fps={FPS} width={1080} height={1920} durationInFrames={CAP2_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="CapMenu" component={CapMenu} fps={FPS} width={1080} height={1920} durationInFrames={CAP3_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="CapPromo" component={CapPromo} fps={FPS} width={1080} height={1920} durationInFrames={CAP4_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="CapRec" component={CapRec} fps={FPS} width={1080} height={1920} durationInFrames={CAP5_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="CapStory" component={CapStory} fps={FPS} width={1080} height={1920} durationInFrames={CAP6_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuFuda" component={TaishuFuda} fps={FPS} width={1080} height={1920} durationInFrames={TFUDA_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuKakegoe" component={TaishuKakegoe} fps={FPS} width={1080} height={1920} durationInFrames={TKOE_DUR} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuNigi" component={TaishuNigi} fps={FPS} width={1080} height={1920} durationInFrames={TNIGI_DUR} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuKaiten" component={TaishuKaiten} fps={FPS} width={1080} height={1920} durationInFrames={TKAI_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuOshi" component={TaishuOshi} fps={FPS} width={1080} height={1920} durationInFrames={TOSHI_DUR} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuOdo" component={TaishuOdo} fps={FPS} width={1080} height={1920} durationInFrames={dur} defaultProps={{ storeName: STORE, handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuZen" component={TaishuZen} fps={FPS} width={1080} height={1920} durationInFrames={150} defaultProps={{ handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuShinbun" component={TaishuShinbun} fps={FPS} width={1080} height={1920} durationInFrames={TSHIN_DUR} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuGrid" component={TaishuGrid} fps={FPS} width={1080} height={1920} durationInFrames={TGRID_DUR} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuTanzaku" component={TaishuTanzaku} fps={FPS} width={1080} height={1920} durationInFrames={TTAN_DUR} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuAkanoren" component={TaishuAkanoren} fps={FPS} width={1080} height={1920} durationInFrames={TANOREN_DUR} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
      <Composition id="TaishuGaku" component={TaishuGaku} fps={FPS} width={1080} height={1920} durationInFrames={150} defaultProps={{ storeName: "すさび湯三条", handle: "@susabiyu_sanjyo" }} />
    </>
  );
};
