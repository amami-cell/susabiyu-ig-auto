// 和・障子越し（しょうじごし）（鮨処すさび湯 専用）。障子の桟（縦横の細い木格子）越しに料理が浮かび、
// 各カットで一枚の障子紙がスッと開いて料理がくっきり見える。町家のやわらかい採光＝和の情緒。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const SHO_BODY = 480;
const SHO_OPEN = STORY_OPEN + 30;
const SHO_END = STORY_END - 30;
export const YSHOJIWA_DUR = SHO_OPEN + SHO_BODY + SHO_END;

// 障子の桟（縦横の格子）。細い木の色で薄く重ねる＝“越し”の情緒。
const ShojiLattice: React.FC<{ line: string; op: number }> = ({ line, op }) => {
  const cols = [180, 360, 540, 720, 900];
  const rows = [320, 620, 920, 1220, 1520];
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: op }}>
      {cols.map((x, i) => <line key={"c" + i} x1={x} y1={0} x2={x} y2={1920} stroke={line} strokeWidth={3} />)}
      {rows.map((y, i) => <line key={"r" + i} x1={0} y1={y} x2={1080} y2={y} stroke={line} strokeWidth={3} />)}
    </svg>
  );
};

const ShojiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = SHO_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 82, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  // カット頭：障子紙(半透明の乳白パネル)が左右へ開く→料理がくっきり。
  const open = interpolate(seg.local, [4, 40], [0, 540], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.03} />
        )} />
      </AbsoluteFill>
      {/* 障子紙（乳白）が左右に開く */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 540, transform: "translateX(" + (-open) + "px)", background: "linear-gradient(90deg, rgba(244,238,222,0.94), rgba(238,231,212,0.9))", boxShadow: "inset -12px 0 24px rgba(120,90,50,0.18)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 540, transform: "translateX(" + open + "px)", background: "linear-gradient(270deg, rgba(244,238,222,0.94), rgba(238,231,212,0.9))", boxShadow: "inset 12px 0 24px rgba(120,90,50,0.18)" }} />
      {/* 桟（細い木格子）は常時うっすら＝“障子越し”の名残 */}
      <ShojiLattice line={"rgba(120,86,48,0.5)"} op={0.5 * (1 - open / 540) + 0.16} />
      {/* 上からのやわらかい採光 */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 40% at 50% 8%, rgba(255,240,208,0.22) 0%, transparent 60%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.32) 0%, rgba(10,8,6,0) 30%, rgba(10,8,6,0) 56%, rgba(10,8,6,0.78) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>鮨処すさび湯</div>
      </div>

      {/* 下：料理名＋説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 238, ...rise(seg.local, 10, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>{one}</div>
        <div style={{ marginTop: 14, width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 40), maxWidth: 780 }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 38, 780, 26) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={92} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuShojiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YSHOJIWA_DUR - 30, YSHOJIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={SHO_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={SHO_OPEN} /></Sequence>
      <Sequence from={SHO_OPEN} durationInFrames={SHO_BODY}><ShojiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={SHO_OPEN + SHO_BODY - STORY_XF} durationInFrames={SHO_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
