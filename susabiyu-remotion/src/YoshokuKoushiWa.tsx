// 和・縦格子（こうし）（鮨処すさび湯 専用）。京町家の格子戸越し。縦の木格子の奥で料理が横に流れ、
// 格子の隙間からちらりと旬が覗く。カットの変わり目に格子戸がスッと引かれるように写真がスライド。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const KO_BODY = 480;
const KO_OPEN = STORY_OPEN + 30;
const KO_END = STORY_END - 30;
export const YKOUSHIWA_DUR = KO_OPEN + KO_BODY + KO_END;

// 縦の木格子（本数・間隔は町家の格子戸に寄せる）
const Koushi: React.FC<{ line: string }> = ({ line }) => {
  const bars = 13;
  const gap = 1080 / bars;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", top: 0, bottom: 0, left: i * gap + gap / 2 - 8, width: 16,
          background: "linear-gradient(90deg, rgba(20,14,9,0.0), rgba(28,19,12,0.92) 40%, rgba(52,36,22,0.92) 55%, rgba(20,14,9,0.0))",
          boxShadow: "0 0 6px rgba(0,0,0,0.4)",
        }} />
      ))}
      {/* 上下の桟 */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, height: 14, background: "rgba(28,19,12,0.9)" }} />
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, height: 14, background: "rgba(28,19,12,0.9)" }} />
    </AbsoluteFill>
  );
};

const KoushiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = KO_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 80, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  // カット頭：写真が右→定位置へスライド（格子戸を引く）。以後ゆっくり左へ流れる。
  const slideIn = interpolate(seg.local, [0, 26], [140, 0], { ...clamp, easing: EASE });
  const drift = interpolate(seg.local, [26, DUR / 4], [0, -40], clamp);
  const tx = slideIn + drift;
  const zoom = interpolate(seg.local, [0, DUR / 4], [1.08, 1.14], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 奥の料理（横に流れる） */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div key={seg.i} style={{ position: "absolute", inset: -60, transform: "translateX(" + tx + "px) scale(" + zoom + ")" }}>
          <PhotoLayer src={it.src} frame={seg.local} dur={DUR / 4} from={1} to={1} sat={1.04} />
        </div>
      </AbsoluteFill>
      {/* 木格子 */}
      <Koushi line={T.line} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.4) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 54%, rgba(10,8,6,0.82) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>鮨処すさび湯</div>
      </div>

      {/* 下：料理名＋説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 238, ...rise(seg.local, 10, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>{one}</div>
        <div style={{ marginTop: 14, width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 40), maxWidth: 800 }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.85)", fontSize: fitLines(desc, 38, 800, 26) }}>
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

export const YoshokuKoushiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YKOUSHIWA_DUR - 30, YKOUSHIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={KO_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={KO_OPEN} /></Sequence>
      <Sequence from={KO_OPEN} durationInFrames={KO_BODY}><KoushiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={KO_OPEN + KO_BODY - STORY_XF} durationInFrames={KO_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
