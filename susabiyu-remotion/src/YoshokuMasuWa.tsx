// 和・枡（ます）グリッド（鮨処すさび湯 専用）。2×2の升目に4品を市松で並べ、金の十字罫で仕切る。
// 拍で1マスが立ち（金枠＋明るく）、その料理名を下に。献立の“見せ”＝写真主役で4品を一望。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MASU_BODY = 480;
const MASU_OPEN = STORY_OPEN + 30;
const MASU_END = STORY_END - 30;
export const YMASUWA_DUR = MASU_OPEN + MASU_BODY + MASU_END;

const nameOf = (it: any) => ((it.disp && it.disp.length) ? it.disp : it.caption || "").replace(/[｜\n]/g, "");

const Cell: React.FC<{ item: any; active: boolean; f: number; delay: number }> = ({ item, active, f, delay }) => {
  const zoom = interpolate(f, [delay, delay + MASU_BODY], [1.02, 1.12], clamp);
  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, transform: "scale(" + zoom + ")" }}>
        <PhotoLayer src={item.src} frame={f} dur={MASU_BODY} from={1} to={1} sat={1.03} />
      </div>
      {/* 非アクティブは少し沈める */}
      <div style={{ position: "absolute", inset: 0, background: active ? "rgba(0,0,0,0)" : "rgba(8,6,4,0.5)", transition: "none" }} />
      {/* アクティブは金の内枠 */}
      {active ? <div style={{ position: "absolute", inset: 6, border: "2px solid #D8B36A", boxShadow: "0 0 20px rgba(216,179,106,0.5)" }} /> : null}
    </div>
  );
};

const MasuWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = MASU_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);          // どのマスが立つか
  const act = seg.i;
  const it = items[act];
  const one = nameOf(it);
  const nameSize = fitOneLine(one, 62, 1080 - SAFE.side * 2 - 40, 32);
  const desc = it.desc || typoHeadline;
  const GRID_TOP = 300, GRID_H = 980;

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg," + T.base + "," + T.footBase + ")" }} />
      {/* 上：鮨処すさび湯／献立 */}
      <div style={{ position: "absolute", top: SAFE.top - 66, left: SAFE.side, right: SAFE.side, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 26, letterSpacing: 6 }}>鮨処すさび湯</div>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 20, letterSpacing: 7 }}>OSHINAGAKI</div>
      </div>
      {/* 2×2 枡グリッド */}
      <div style={{ position: "absolute", top: GRID_TOP, left: SAFE.side, right: SAFE.side, height: GRID_H, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 6, border: "2px solid " + T.line, background: T.line, boxShadow: "0 24px 70px rgba(0,0,0,0.5)", opacity: fade(f, 10) }}>
        {items.map((it2, i) => <Cell key={i} item={it2} active={i === act} f={f} delay={0} />)}
      </div>
      <Grain opacity={0.045} />
      {/* 下：立ったマスの料理名＋金罫＋説明文 */}
      <div key={act} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 210, ...rise(seg.local, 4, { dist: 14, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 500, letterSpacing: 2, whiteSpace: "nowrap" }}>{one}</div>
        <div style={{ marginTop: 14, width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 12, opacity: fade(f, 30) }}>
          <div style={{ fontFamily: mincho, color: T.sub, letterSpacing: 1.4, lineHeight: 1.45, fontSize: fitLines(desc, 34, 1080 - SAFE.side * 2 - 40, 24) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 78, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={88} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 23, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuMasuWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YMASUWA_DUR - 30, YMASUWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={MASU_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={MASU_OPEN} /></Sequence>
      <Sequence from={MASU_OPEN} durationInFrames={MASU_BODY}><MasuWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={MASU_OPEN + MASU_BODY - STORY_XF} durationInFrames={MASU_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
