// 和・金継ぎ（きんつぎ）（鮨処すさび湯 専用）。金の細い折れ線が画面を継ぐように描かれ、料理名が現れる。
// 割れを金で継ぐ日本の美意識＝唯一無二の意匠。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const KT_BODY = 480;
const KT_OPEN = STORY_OPEN + 30;
const KT_END = STORY_END - 30;
export const YKINTSUGIWA_DUR = KT_OPEN + KT_BODY + KT_END;

// 金継ぎの折れ線（画面上→下へ蛇行）。総長おおよそ 2100。
const CRACK = "M 760,120 L 700,470 L 820,760 L 690,1080 L 800,1420 L 720,1800";
const CRACK_LEN = 2100;

const KintsugiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = KT_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 80, 620, 38);
  const desc = it.desc || typoHeadline;
  const draw = interpolate(f, [8, 70], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.04} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0) 24%, rgba(10,8,6,0) 52%, rgba(10,8,6,0.8) 100%)" }} />
      {/* 金継ぎの線 */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path d={CRACK} fill="none" stroke={T.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={CRACK_LEN} strokeDashoffset={CRACK_LEN * (1 - draw)}
          style={{ filter: "drop-shadow(0 0 6px rgba(216,179,106,0.6))" }} />
      </svg>
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>鮨処すさび湯</div>
      </div>

      {/* 下左：料理名＋説明文（金継ぎ線の左側に置く） */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, bottom: 240, maxWidth: 620, ...rise(seg.local, 8, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 2, lineHeight: 1.2, textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>{one}</div>
        <div style={{ marginTop: 16, opacity: fade(f, 42) }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 36, 620, 24) }}>
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

export const YoshokuKintsugiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YKINTSUGIWA_DUR - 30, YKINTSUGIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={KT_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={KT_OPEN} /></Sequence>
      <Sequence from={KT_OPEN} durationInFrames={KT_BODY}><KintsugiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={KT_OPEN + KT_BODY - STORY_XF} durationInFrames={KT_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
