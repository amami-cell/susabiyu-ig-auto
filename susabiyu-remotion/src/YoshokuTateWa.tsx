// 縦書き和モダン（鮨処すさび湯 専用ストーリー）。
// 全面写真の上に、料理名を「縦書きの大明朝」で右側に立て、金の縦罫を添える＝和の誌面/軸装の作法。
//   ・写真は4品クロスフェード＋ゆったりケンバーンズ。左〜下に墨のグラデで文字を必ず読ませる。
//   ・右：欧文サブ(小)＋縦書き料理名(大明朝)＋金の縦罫。左下：金の短罫＋料理説明文(横・小明朝)。
//   ・上：鮨処すさび湯 / SUSHI・KYOTO の細いマストヘッド。下：ロゴ＋ハンドル。
// karasuma 専用（他店は使わない）。OP/CLOSE は既存の誌面案(v9)を流用して和で統一。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const TATE_BODY = 480;                 // 16s
const TATE_OPEN = STORY_OPEN + 30;
const TATE_END = STORY_END - 30;
export const YTATEWA_DUR = TATE_OPEN + TATE_BODY + TATE_END;   // 660 = 22.0秒

// 縦書き用に料理名の長さで字の大きさを決める（列が画面高を超えないように）。
const tateSize = (s: string): number => {
  const n = (s || "").replace(/[｜\s]/g, "").length;
  if (n <= 5) return 108;
  if (n <= 7) return 92;
  if (n <= 9) return 78;
  if (n <= 12) return 66;
  return 56;
};

const TateWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = TATE_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const tsz = tateSize(one);
  const desc = it.desc || typoHeadline;
  const barGrow = interpolate(f, [22, 58], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 全面写真（4品クロスフェード） */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.05} to={1.12} sat={1.05} />
        )} />
      </AbsoluteFill>
      {/* 墨のグラデ：右上と下を効かせて縦書き見出し・説明文を必ず読ませる */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.55) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 50%, rgba(10,8,6,0.72) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(270deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0) 42%)" }} />
      <Grain opacity={0.05} />

      {/* マストヘッド（上） */}
      <div style={{ position: "absolute", top: SAFE.top - 78, left: SAFE.side, right: SAFE.side, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 27, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>鮨処すさび湯</div>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8 }}>SUSHI・KYOTO</div>
      </div>

      {/* 右：縦書きの料理名（大明朝）＋金の縦罫 */}
      <div key={seg.i} style={{ position: "absolute", top: SAFE.top + 40, right: SAFE.side, display: "flex", alignItems: "flex-start", ...rise(seg.local, 6, { dist: 22, blur: 5 }) }}>
        <div style={{ writingMode: "vertical-rl", textOrientation: "upright", fontFamily: mincho, color: "#FBF5E7", fontSize: tsz, fontWeight: 500, letterSpacing: 6, lineHeight: 1.5, maxHeight: 1180, textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>{one}</div>
        {/* 金の縦罫（上から引かれる） */}
        <div style={{ width: 3, marginLeft: 22, height: 360, background: T.accent, opacity: 0.9, transform: "scaleY(" + barGrow + ")", transformOrigin: "top" }} />
        {/* 欧文サブ（縦罫の外側・上） */}
        <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: T.accent, fontSize: 20, letterSpacing: 8, marginLeft: 10, textTransform: "uppercase", opacity: fade(f, 16) }}>{it.sub || "SUSHI"}</div>
      </div>

      {/* 左下：金の短罫＋料理説明文（横・小明朝） */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 210, maxWidth: 620, opacity: fade(f, 36) }}>
        <div style={{ width: 108, height: 1, background: T.accent, opacity: 0.85, marginBottom: 20 }} />
        <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 40, 620, 26) }}>
          {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
        </div>
      </div>

      {/* フッター：ロゴ＋ハンドル（左下） */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 76, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={98} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuTateWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YTATEWA_DUR - 30, YTATEWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={TATE_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={TATE_OPEN} /></Sequence>
      <Sequence from={TATE_OPEN} durationInFrames={TATE_BODY}><TateWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={TATE_OPEN + TATE_BODY - STORY_XF} durationInFrames={TATE_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
