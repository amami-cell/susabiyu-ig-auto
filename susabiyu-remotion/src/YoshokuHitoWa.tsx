// 和・本日の一皿（鮨処すさび湯 専用ストーリー）。
// 一品を主役に、中央構図＋広い余白。朱の落款（印）を効かせた和モダンの静けさ。
//   ・全面写真(4品クロスフェード・寄り)＋墨グラデ。中央上に「本日の一皿」と細罫。
//   ・中央下：朱の落款(小)→料理名(中明朝・中央)→金の短罫→料理説明文(中央・小明朝)。
//   ・下：ロゴ＋ハンドル(中央)。karasuma 専用。OP/CLOSE は誌面案(v9)で和統一。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, Grain, StoreLogo, PhotoLayer, Slides, fitOneLine, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const HITO_BODY = 480;
const HITO_OPEN = STORY_OPEN + 30;
const HITO_END = STORY_END - 30;
export const YHITOWA_DUR = HITO_OPEN + HITO_BODY + HITO_END;

const SHU = "#A6362B";   // 朱（落款）

const HitoWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = HITO_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 84, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  const sealIn = interpolate(f, [16, 40], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.06} to={1.12} sat={1.05} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.58) 0%, rgba(10,8,6,0.08) 28%, rgba(10,8,6,0.1) 52%, rgba(10,8,6,0.78) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上中央：本日の一皿＋細罫 */}
      <div style={{ position: "absolute", top: SAFE.top - 66, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 30, letterSpacing: 12, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>本日の一皿</div>
        <div style={{ width: 64, height: 1, background: T.accent, opacity: 0.8 }} />
      </div>

      {/* 中央下：落款→料理名→金罫→説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300, display: "flex", flexDirection: "column", alignItems: "center", ...rise(seg.local, 6, { dist: 20, blur: 5 }) }}>
        {/* 朱の落款 */}
        <div style={{ width: 62, height: 62, background: SHU, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, opacity: sealIn, transform: "scale(" + (0.9 + 0.1 * sealIn) + ")", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
          <div style={{ fontFamily: mincho, color: "#F6ECD8", fontSize: 30, fontWeight: 600, letterSpacing: 0 }}>鮨</div>
        </div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 4, lineHeight: 1.2, whiteSpace: "nowrap", textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}>{one}</div>
        <div style={{ marginTop: 22, width: 110, height: 1, background: T.accent, opacity: 0.85 * fade(f, 28) }} />
        <div style={{ marginTop: 20, opacity: fade(f, 38), maxWidth: 820 }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textAlign: "center", textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 40, 1080 - SAFE.side * 2 - 40, 26) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>

      {/* 下中央：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={100} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuHitoWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YHITOWA_DUR - 30, YHITOWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={HITO_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={HITO_OPEN} /></Sequence>
      <Sequence from={HITO_OPEN} durationInFrames={HITO_BODY}><HitoWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={HITO_OPEN + HITO_BODY - STORY_XF} durationInFrames={HITO_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
