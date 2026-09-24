// 和・扇（おうぎ）（鮨処すさび湯 専用）。画面下中央を要（かなめ）に、金の扇骨がスッと開き、
// 扇面の弧の中で料理が映える。祝祭・末広がり＝ハレの意匠。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const OG_BODY = 480;
const OG_OPEN = STORY_OPEN + 30;
const OG_END = STORY_END - 30;
export const YOUGIWA_DUR = OG_OPEN + OG_BODY + OG_END;

const PIVOT_X = 540, PIVOT_Y = 1720, RIB_LEN = 1360;

// 扇骨（金の線）を open(0→1) に応じて開く
const Fan: React.FC<{ open: number; accent: string; line: string }> = ({ open, accent, line }) => {
  const ribs = 9;
  const spread = 128 * open; // 度：±64°まで開く
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: ribs }).map((_, i) => {
        const t = ribs === 1 ? 0.5 : i / (ribs - 1);
        const deg = -spread / 2 + spread * t;
        const rad = (deg - 90) * Math.PI / 180;
        const x2 = PIVOT_X + Math.cos(rad) * RIB_LEN;
        const y2 = PIVOT_Y + Math.sin(rad) * RIB_LEN;
        return <line key={i} x1={PIVOT_X} y1={PIVOT_Y} x2={x2} y2={y2} stroke={i === 0 || i === ribs - 1 ? accent : line} strokeWidth={i === 0 || i === ribs - 1 ? 4 : 2.5} strokeLinecap="round" opacity={0.85} />;
      })}
      {/* 扇面の外弧 */}
      <circle cx={PIVOT_X} cy={PIVOT_Y} r={RIB_LEN} fill="none" stroke={accent} strokeWidth={4}
        strokeDasharray={2 * Math.PI * RIB_LEN}
        strokeDashoffset={2 * Math.PI * RIB_LEN * (1 - open * 0.36)}
        transform={"rotate(" + (-90 - spread / 2) + " " + PIVOT_X + " " + PIVOT_Y + ")"} opacity={0.6} />
      {/* 要 */}
      <circle cx={PIVOT_X} cy={PIVOT_Y} r={12} fill={accent} />
    </svg>
  );
};

const OugiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = OG_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 80, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  const open = interpolate(f, [6, 60], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.04} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(80% 55% at 50% 100%, rgba(216,179,106,0.14) 0%, transparent 60%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.4) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 52%, rgba(10,8,6,0.82) 100%)" }} />
      <Fan open={open} accent={T.accent} line={T.line} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: 0, right: 0, textAlign: "center", opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 8, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>鮨処すさび湯</div>
      </div>

      {/* 下：料理名＋説明文（中央寄せ＝扇の中心に載せる） */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 250, textAlign: "center", ...rise(seg.local, 10, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.75)" }}>{one}</div>
        <div style={{ margin: "14px auto 0", width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 42) }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.85)", fontSize: fitLines(desc, 36, 1080 - SAFE.side * 2 - 40, 24) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={88} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 23, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuOugiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YOUGIWA_DUR - 30, YOUGIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={OG_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={OG_OPEN} /></Sequence>
      <Sequence from={OG_OPEN} durationInFrames={OG_BODY}><OugiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={OG_OPEN + OG_BODY - STORY_XF} durationInFrames={OG_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
