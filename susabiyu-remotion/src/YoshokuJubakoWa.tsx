// 和・重箱（じゅうばこ）（鮨処すさび湯 専用）。黒漆に金縁の三段重を縦に積み、各段に一品。
// 拍で立った段がすっと前に出て明るくなり、その料理名を下に。ハレの日の設え＝格の高さ。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const JU_BODY = 480;
const JU_OPEN = STORY_OPEN + 30;
const JU_END = STORY_END - 30;
export const YJUBAKOWA_DUR = JU_OPEN + JU_BODY + JU_END;

const nameOf = (it: any) => ((it.disp && it.disp.length) ? it.disp : it.caption || "").replace(/[｜\n]/g, "");

// 三段のうちの一段（黒漆＋金縁の椀箱に写真を納める）
const Tier: React.FC<{ item: any; active: boolean; f: number; accent: string; line: string }> = ({ item, active, f, accent, line }) => {
  const zoom = interpolate(f, [0, JU_BODY], [1.03, 1.12], clamp);
  const lift = active ? -14 : 0;
  return (
    <div style={{
      position: "relative", flex: 1, margin: "0 0 10px 0", transform: "translateX(" + lift + "px)",
      background: "#0B0806", border: "3px solid " + line,
      boxShadow: active ? "0 14px 40px rgba(0,0,0,0.55), 0 0 0 2px " + accent + "aa" : "0 8px 22px rgba(0,0,0,0.45)",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 8, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: "scale(" + zoom + ")" }}>
          <PhotoLayer src={item.src} frame={f} dur={JU_BODY} from={1} to={1} sat={1.04} />
        </div>
        {/* 非アクティブは沈める */}
        <div style={{ position: "absolute", inset: 0, background: active ? "rgba(0,0,0,0)" : "rgba(8,6,4,0.52)" }} />
        {/* 金の内枠 */}
        <div style={{ position: "absolute", inset: 3, border: "1px solid " + accent + (active ? "cc" : "55") }} />
      </div>
    </div>
  );
};

const JubakoWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = JU_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const tiers = [0, 1, 2].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 3, f);
  const act = seg.i;
  const it = tiers[act];
  const one = nameOf(it);
  const nameSize = fitOneLine(one, 60, 1080 - SAFE.side * 2 - 260, 30);
  const desc = it.desc || typoHeadline;

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg," + T.base + "," + T.footBase + ")" }} />
      {/* 金の紗（うっすら） */}
      <AbsoluteFill style={{ background: "radial-gradient(80% 40% at 50% 6%, " + T.accent + "18 0%, transparent 60%)" }} />

      {/* 上：鮨処すさび湯／御献立 */}
      <div style={{ position: "absolute", top: SAFE.top - 66, left: SAFE.side, right: SAFE.side, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 26, letterSpacing: 6 }}>鮨処すさび湯</div>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 20, letterSpacing: 7 }}>JUBAKO</div>
      </div>

      {/* 三段重 */}
      <div style={{ position: "absolute", top: 296, left: SAFE.side + 30, right: SAFE.side + 30, height: 1000, display: "flex", flexDirection: "column", opacity: fade(f, 10) }}>
        {tiers.map((it2, i) => <Tier key={i} item={it2} active={i === act} f={f} accent={T.accent} line={T.line} />)}
      </div>
      <Grain opacity={0.045} />

      {/* 下：立った段の料理名＋金罫＋説明文 */}
      <div key={act} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 206, ...rise(seg.local, 4, { dist: 14, blur: 4 }) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 6, fontWeight: 600 }}>{"其の" + "一二三"[act]}</span>
          <span style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 500, letterSpacing: 2, whiteSpace: "nowrap" }}>{one}</span>
        </div>
        <div style={{ marginTop: 12, width: 100, height: 1, background: T.accent, opacity: 0.85 }} />
        <div style={{ marginTop: 12, opacity: fade(f, 30) }}>
          <div style={{ fontFamily: mincho, color: T.sub, letterSpacing: 1.4, lineHeight: 1.45, fontSize: fitLines(desc, 34, 1080 - SAFE.side * 2 - 40, 24) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 76, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={84} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 23, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuJubakoWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YJUBAKOWA_DUR - 30, YJUBAKOWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={JU_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={JU_OPEN} /></Sequence>
      <Sequence from={JU_OPEN} durationInFrames={JU_BODY}><JubakoWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={JU_OPEN + JU_BODY - STORY_XF} durationInFrames={JU_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
