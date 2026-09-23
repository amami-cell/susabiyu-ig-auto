// 和・暖簾（のれん）くぐり（鮨処すさび湯 専用）。弁柄の暖簾が左右に分かれて料理が現れる＝入店感。
// 写真は全面、暖簾は入口の演出のみ。OP/CLOSEは誌面案(v9)で和統一。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const NOREN_BODY = 480;
const NOREN_OPEN = STORY_OPEN + 30;
const NOREN_END = STORY_END - 30;
export const YNORENWA_DUR = NOREN_OPEN + NOREN_BODY + NOREN_END;
const BENGARA = "#7B3B2E";

const NorenWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = NOREN_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 80, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  // 冒頭だけ暖簾が左右に開く（本編開始〜0.9秒）。以降は開いたまま。
  const part = interpolate(f, [0, 26], [0, 560], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 全面写真 */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.05} to={1.12} sat={1.05} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 54%, rgba(10,8,6,0.78) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 暖簾（左右2枚＋中央スリット）。弁柄地に白の店名。冒頭で開く。 */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: 560, background: BENGARA, transform: "translateX(" + (-part) + "px)", boxShadow: "2px 0 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 26 }}>
        <div style={{ writingMode: "vertical-rl", fontFamily: mincho, color: "#F4EDDD", fontSize: 40, letterSpacing: 8 }}>鮨処</div>
      </div>
      <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: 560, background: BENGARA, transform: "translateX(" + part + "px)", boxShadow: "-2px 0 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 26 }}>
        <div style={{ writingMode: "vertical-rl", fontFamily: mincho, color: "#F4EDDD", fontSize: 40, letterSpacing: 8 }}>すさび湯</div>
      </div>

      {/* 下：料理名＋金罫＋説明文（左寄せ） */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 230, ...rise(seg.local, 6, { dist: 20, blur: 5 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", marginBottom: 12 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, lineHeight: 1.2, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>{one}</div>
        <div style={{ marginTop: 18, width: 104, height: 1, background: T.accent, opacity: 0.85 * fade(f, 30) }} />
        <div style={{ marginTop: 16, opacity: fade(f, 38), maxWidth: 760 }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 38, 760, 26) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 84, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={96} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuNorenWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YNORENWA_DUR - 30, YNORENWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={NOREN_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={NOREN_OPEN} /></Sequence>
      <Sequence from={NOREN_OPEN} durationInFrames={NOREN_BODY}><NorenWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={NOREN_OPEN + NOREN_BODY - STORY_XF} durationInFrames={NOREN_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
