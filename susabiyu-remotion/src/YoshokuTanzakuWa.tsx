// 和・短冊（たんざく）（鮨処すさび湯 専用）。全面写真に、縦の和紙短冊帯（生成り）で料理名を縦書き。
// 季節の旬を軽やかに。写真主役・余白広め。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const TANZ_BODY = 480;
const TANZ_OPEN = STORY_OPEN + 30;
const TANZ_END = STORY_END - 30;
export const YTANZAKUWA_DUR = TANZ_OPEN + TANZ_BODY + TANZ_END;

const tsize = (s: string): number => {
  const n = (s || "").replace(/[｜\s]/g, "").length;
  if (n <= 5) return 66; if (n <= 7) return 56; if (n <= 9) return 48; if (n <= 12) return 40; return 34;
};

const TanzakuWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = TANZ_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const desc = it.desc || typoHeadline;
  const drop = interpolate(f, [8, 34], [-40, 0], { ...clamp, easing: EASE }); // 短冊が上から下りる

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.05} to={1.12} sat={1.05} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.42) 0%, rgba(10,8,6,0) 30%, rgba(10,8,6,0) 58%, rgba(10,8,6,0.72) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 66, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 26, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>鮨処すさび湯</div>
      </div>

      {/* 短冊帯（生成り和紙・右）：縦書き料理名＋上に季節の小印 */}
      <div key={seg.i} style={{ position: "absolute", top: SAFE.top + 20 + drop, right: SAFE.side, width: 128, minHeight: 560, background: "linear-gradient(180deg,#F4ECDA,#EBE1CC)", border: "1px solid " + T.line, boxShadow: "0 18px 44px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 26, paddingBottom: 26, opacity: fade(seg.local, 4) }}>
        <div style={{ width: 44, height: 44, borderRadius: 4, border: "1.5px solid " + T.slab, color: T.slab, fontFamily: mincho, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>旬</div>
        <div style={{ writingMode: "vertical-rl", fontFamily: mincho, color: "#241D14", fontSize: tsize(one), fontWeight: 500, letterSpacing: 5, lineHeight: 1.5 }}>{one}</div>
      </div>

      {/* 左下：金の短罫＋説明文 */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 210, maxWidth: 640, opacity: fade(f, 36) }}>
        <div style={{ width: 100, height: 1, background: T.accent, opacity: 0.85, marginBottom: 18 }} />
        <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 38, 640, 26) }}>
          {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
        </div>
      </div>
      {/* 左下端：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 78, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={92} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuTanzakuWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YTANZAKUWA_DUR - 30, YTANZAKUWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={TANZ_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={TANZ_OPEN} /></Sequence>
      <Sequence from={TANZ_OPEN} durationInFrames={TANZ_BODY}><TanzakuWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={TANZ_OPEN + TANZ_BODY - STORY_XF} durationInFrames={TANZ_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
