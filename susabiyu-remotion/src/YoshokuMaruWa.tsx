// 和・円窓（まるまど）（鮨処すさび湯 専用）。料理を金の細環の丸窓越しに見せ、窓が開いて現れる。
// 京町家の下地窓の趣。写真主役・墨地・広い余白。OP/CLOSEは誌面案(v9)で和統一。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MARU_BODY = 480;
const MARU_OPEN = STORY_OPEN + 30;
const MARU_END = STORY_END - 30;
export const YMARUWA_DUR = MARU_OPEN + MARU_BODY + MARU_END;

const MaruWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = MARU_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 78, 1080 - SAFE.side * 2 - 40, 38);
  const desc = it.desc || typoHeadline;
  const open = interpolate(f, [8, 40], [0.86, 1], { ...clamp, easing: EASE }); // 窓が開く

  const D = 900;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 70% at 50% 34%, " + T.footBase + " 0%, " + T.base + " 70%)" }} />
      {/* 上：鮨処すさび湯／SUSHI・KYOTO */}
      <div style={{ position: "absolute", top: SAFE.top - 64, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 28, letterSpacing: 10 }}>鮨処すさび湯</div>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 20, letterSpacing: 8 }}>SUSHI・KYOTO</div>
      </div>
      {/* 丸窓（金の細環の中に写真4品クロスフェード） */}
      <div style={{ position: "absolute", top: 300, left: (1080 - D) / 2, width: D, height: D, borderRadius: "50%", overflow: "hidden", border: "2px solid " + T.line, boxShadow: "0 26px 80px rgba(0,0,0,0.55), inset 0 0 60px rgba(0,0,0,0.35)", transform: "scale(" + open + ")", transformOrigin: "center" }}>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.05} to={1.11} sat={1.05} />
        )} />
      </div>
      {/* 金の外環（細い輪をもう一重） */}
      <div style={{ position: "absolute", top: 300 - 14, left: (1080 - D) / 2 - 14, width: D + 28, height: D + 28, borderRadius: "50%", border: "1px solid " + T.accent, opacity: 0.45 * fade(f, 16) }} />
      <Grain opacity={0.045} />
      {/* 下：料理名＋金罫＋説明文（中央） */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 250, display: "flex", flexDirection: "column", alignItems: "center", ...rise(seg.local, 6, { dist: 18, blur: 5 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", marginBottom: 14 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 500, letterSpacing: 3, lineHeight: 1.2, whiteSpace: "nowrap", textAlign: "center", textShadow: "0 2px 16px rgba(0,0,0,0.4)" }}>{one}</div>
        <div style={{ marginTop: 20, width: 104, height: 1, background: T.accent, opacity: 0.85 * fade(f, 28) }} />
        <div style={{ marginTop: 18, opacity: fade(f, 38), maxWidth: 820 }}>
          <div style={{ fontFamily: mincho, color: T.sub, letterSpacing: 1.5, lineHeight: 1.5, textAlign: "center", fontSize: fitLines(desc, 38, 1080 - SAFE.side * 2 - 40, 26) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 下中央：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={96} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuMaruWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YMARUWA_DUR - 30, YMARUWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={MARU_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={MARU_OPEN} /></Sequence>
      <Sequence from={MARU_OPEN} durationInFrames={MARU_BODY}><MaruWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={MARU_OPEN + MARU_BODY - STORY_XF} durationInFrames={MARU_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
