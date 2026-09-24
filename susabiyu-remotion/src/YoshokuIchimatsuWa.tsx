// 和・市松（いちまつ）（鮨処すさび湯 専用）。市松模様のタイルが二手に分かれて開き、料理が現れる。
// 伝統文様＝繁栄の意。幾何学的で品のある“めくれ”の転換。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const IM_BODY = 480;
const IM_OPEN = STORY_OPEN + 30;
const IM_END = STORY_END - 30;
export const YICHIMATSUWA_DUR = IM_OPEN + IM_BODY + IM_END;

const COLS = 6, ROWS = 8;

const IchimatsuWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = IM_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 80, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.04} />
        )} />
      </AbsoluteFill>

      {/* 市松タイル（base色）：偶数マス→奇数マスの二手で開く */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const parity = (r + c) % 2;
            const o = parity === 0
              ? interpolate(seg.local, [6, 26], [1, 0], clamp)
              : interpolate(seg.local, [22, 44], [1, 0], clamp);
            if (o <= 0.001) return null;
            return (
              <div key={r + "-" + c} style={{
                position: "absolute", left: (c / COLS) * 100 + "%", top: (r / ROWS) * 100 + "%",
                width: 100 / COLS + "%", height: 100 / ROWS + "%",
                background: parity === 0 ? T.base : T.footBase,
                border: "0.5px solid " + T.line + "33", opacity: o,
              }} />
            );
          })
        )}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.4) 0%, rgba(10,8,6,0) 28%, rgba(10,8,6,0) 54%, rgba(10,8,6,0.82) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>鮨処すさび湯</div>
      </div>

      {/* 下：料理名＋説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 238, ...rise(seg.local, 30, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}>{one}</div>
        <div style={{ marginTop: 14, width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 56), maxWidth: 800 }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.8)", fontSize: fitLines(desc, 38, 800, 26) }}>
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

export const YoshokuIchimatsuWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YICHIMATSUWA_DUR - 30, YICHIMATSUWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={IM_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={IM_OPEN} /></Sequence>
      <Sequence from={IM_OPEN} durationInFrames={IM_BODY}><IchimatsuWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={IM_OPEN + IM_BODY - STORY_XF} durationInFrames={IM_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
