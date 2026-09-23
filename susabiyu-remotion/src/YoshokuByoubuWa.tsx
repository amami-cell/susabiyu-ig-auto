// 和・金屏風（きんびょうぶ）（鮨処すさび湯 専用）。料理を金屏風の折り面に映すように、縦の折り目（陰影）と
// 金の継ぎ目・外枠で仕立てる。折り面の陰影がハレの奥行きを生む。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const BY_BODY = 480;
const BY_OPEN = STORY_OPEN + 30;
const BY_END = STORY_END - 30;
export const YBYOUBUWA_DUR = BY_OPEN + BY_BODY + BY_END;

const PANELS = 6;

const ByoubuWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = BY_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 78, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  // 折りが開く：屏風全体を横に少し広げる（scaleX 0.94→1）＋継ぎ目が引かれる
  const openX = interpolate(f, [6, 56], [0.94, 1], { ...clamp, easing: EASE });
  const seamDraw = interpolate(f, [10, 60], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 金地の縁（外側にうっすら金） */}
      <AbsoluteFill style={{ background: "radial-gradient(90% 60% at 50% 30%, " + T.accent + "16 0%, transparent 60%)" }} />

      {/* 屏風本体（scaleXで開く） */}
      <div style={{ position: "absolute", inset: 0, transform: "scaleX(" + openX + ")", transformOrigin: "50% 50%" }}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Slides count={4} total={DUR} render={(i, local, segd) => (
            <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.05} to={1.11} sat={1.05} />
          )} />
        </AbsoluteFill>
        {/* 折り面の陰影（パネルごとに左右で明暗を交互に） */}
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {Array.from({ length: PANELS }).map((_, i) => (
            <div key={i} style={{
              position: "absolute", top: 0, bottom: 0, left: (i / PANELS) * 100 + "%", width: 100 / PANELS + "%",
              background: i % 2 === 0
                ? "linear-gradient(90deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.22) 100%)"
                : "linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(255,240,205,0.06) 55%, rgba(0,0,0,0.32) 100%)",
            }} />
          ))}
          {/* 金の継ぎ目（上から引かれる） */}
          {Array.from({ length: PANELS - 1 }).map((_, i) => (
            <div key={"s" + i} style={{
              position: "absolute", top: 0, left: ((i + 1) / PANELS) * 100 + "%", width: 2, height: (1920 * seamDraw) + "px",
              background: "linear-gradient(180deg," + T.line + "," + T.accent + ")", boxShadow: "0 0 6px rgba(216,179,106,0.5)",
            }} />
          ))}
        </AbsoluteFill>
      </div>

      {/* 外枠（金） */}
      <div style={{ position: "absolute", inset: 22, border: "3px solid " + T.accent, opacity: 0.55 }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.36) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 52%, rgba(10,8,6,0.82) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>鮨処すさび湯</div>
      </div>

      {/* 下：料理名＋説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 244, ...rise(seg.local, 10, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.75)" }}>{one}</div>
        <div style={{ marginTop: 14, width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 42), maxWidth: 800 }}>
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

export const YoshokuByoubuWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YBYOUBUWA_DUR - 30, YBYOUBUWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={BY_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={BY_OPEN} /></Sequence>
      <Sequence from={BY_OPEN} durationInFrames={BY_BODY}><ByoubuWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={BY_OPEN + BY_BODY - STORY_XF} durationInFrames={BY_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
