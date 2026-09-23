// 和・対（つい）二枚組（鮨処すさび湯 専用）。2品を上下対に並べ、中央に金の細横罫。
// 食べ比べ／握り2貫／お造り×前菜などのペアリング訴求。写真主役・墨地。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade, fitOneLine,
  Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const TSUI_BODY = 480;
const TSUI_OPEN = STORY_OPEN + 30;
const TSUI_END = STORY_END - 30;
export const YTSUIWA_DUR = TSUI_OPEN + TSUI_BODY + TSUI_END;

const label1 = (it: any) => {
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  return (nm || "").replace(/[｜\n]/g, "");
};

const TsuiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = TSUI_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3, 4, 5].map((i) => p[i] || p[p.length - 1]);
  // 2ペアを巡回（[0,1] → [2,3]）
  const seg = segNow(DUR, 2, f);
  const a = items[seg.i * 2];
  const b = items[seg.i * 2 + 1];
  const na = label1(a), nb = label1(b);
  const sza = fitOneLine(na, 52, 1080 - SAFE.side * 2 - 40, 28);
  const szb = fitOneLine(nb, 52, 1080 - SAFE.side * 2 - 40, 28);
  const line = interpolate(f, [16, 46], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 上の一皿 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 900, overflow: "hidden" }}>
        <Slides count={2} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i * 2].src} frame={local} dur={segd} from={1.03} to={1.09} sat={1.05} />
        )} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.4) 0%, rgba(10,8,6,0) 40%, rgba(10,8,6,0.55) 100%)" }} />
      </div>
      {/* 下の一皿 */}
      <div style={{ position: "absolute", top: 900, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        <Slides count={2} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i * 2 + 1].src} frame={local} dur={segd} from={1.03} to={1.09} sat={1.05} />
        )} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0) 40%, rgba(10,8,6,0.5) 100%)" }} />
      </div>
      {/* 中央：金の細横罫＋「対」 */}
      <div style={{ position: "absolute", top: 900 - 1, left: SAFE.side, right: SAFE.side, height: 2, background: T.accent, opacity: 0.9, transform: "scaleX(" + line + ")", transformOrigin: "center" }} />
      <div style={{ position: "absolute", top: 900 - 34, left: 0, right: 0, textAlign: "center", opacity: fade(f, 20) }}>
        <span style={{ display: "inline-block", background: T.base, color: T.accent, fontFamily: mincho, fontSize: 30, letterSpacing: 4, padding: "0 20px" }}>対</span>
      </div>
      <Grain opacity={0.05} />

      {/* 上の料理名（上側・左寄せ） */}
      <div key={"a" + seg.i} style={{ position: "absolute", top: SAFE.top + 20, left: SAFE.side, right: SAFE.side, ...rise(seg.local, 6, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 20, letterSpacing: 7, textTransform: "uppercase", marginBottom: 8 }}>{a.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: sza, fontWeight: 500, letterSpacing: 2, whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{na}</div>
      </div>
      {/* 下の料理名（下側・左寄せ） */}
      <div key={"b" + seg.i} style={{ position: "absolute", bottom: 210, left: SAFE.side, right: SAFE.side, ...rise(seg.local, 10, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 20, letterSpacing: 7, textTransform: "uppercase", marginBottom: 8 }}>{b.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: szb, fontWeight: 500, letterSpacing: 2, whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{nb}</div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 82, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={92} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuTsuiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YTSUIWA_DUR - 30, YTSUIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={TSUI_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={TSUI_OPEN} /></Sequence>
      <Sequence from={TSUI_OPEN} durationInFrames={TSUI_BODY}><TsuiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={TSUI_OPEN + TSUI_BODY - STORY_XF} durationInFrames={TSUI_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
