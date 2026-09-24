// 和・水面（みなも）（鮨処すさび湯 専用）。上に料理、水際の金の一線を境に、下へ静かな“映り込み”。
// 反転＋ぼかし＋ゆらぎで水鏡を表現＝涼やかで凛とした和の余白。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MIN_BODY = 480;
const MIN_OPEN = STORY_OPEN + 30;
const MIN_END = STORY_END - 30;
export const YMINAMOWA_DUR = MIN_OPEN + MIN_BODY + MIN_END;

const WATER_Y = 1150; // 水際の位置

const MinamoWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = MIN_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 78, 1080 - SAFE.side * 2 - 40, 38);
  const desc = it.desc || typoHeadline;
  // 水面のゆらぎ（ごく僅かな横スケール＝さざ波）
  const rip = Math.sin(f / 14) * 0.006;
  const shimmer = interpolate(seg.local, [0, 60], [0, 60], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 上：料理（水際まで） */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: WATER_Y, overflow: "hidden" }}>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.04} />
        )} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.34) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 62%, rgba(10,8,6,0.5) 100%)" }} />
      </div>
      {/* 水際の金の一線＋にじみ */}
      <div style={{ position: "absolute", top: WATER_Y - 1, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, " + T.accent + ", transparent)", boxShadow: "0 0 18px rgba(216,179,106,0.6)" }} />
      {/* 下：映り込み（反転＋ぼかし＋暗く） */}
      <div style={{ position: "absolute", top: WATER_Y, left: 0, right: 0, bottom: 0, overflow: "hidden", background: T.footBase }}>
        <div style={{ position: "absolute", inset: 0, transform: "scaleY(-1) scaleX(" + (1 + rip) + ")", filter: "blur(6px) brightness(0.5) saturate(1.05)", opacity: 0.5 }}>
          <Slides count={4} total={DUR} render={(i, local, segd) => (
            <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.04} />
          )} />
        </div>
        {/* 水面のトーン＋横に流れる光条 */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,16,12,0.2) 0%, rgba(20,16,12,0.72) 100%)" }} />
        <div style={{ position: "absolute", top: 40 + shimmer, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(216,179,106,0.28), transparent)" }} />
      </div>
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>鮨処すさび湯</div>
      </div>

      {/* 水際のすぐ下：料理名＋説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: WATER_Y + 40, ...rise(seg.local, 8, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}>{one}</div>
        <div style={{ marginTop: 14, opacity: fade(f, 42), maxWidth: 820 }}>
          <div style={{ fontFamily: mincho, color: "#EFE3CC", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.8)", fontSize: fitLines(desc, 36, 820, 24) }}>
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

export const YoshokuMinamoWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YMINAMOWA_DUR - 30, YMINAMOWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={MIN_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={MIN_OPEN} /></Sequence>
      <Sequence from={MIN_OPEN} durationInFrames={MIN_BODY}><MinamoWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={MIN_OPEN + MIN_BODY - STORY_XF} durationInFrames={MIN_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
