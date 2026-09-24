// 和・箔押し（はくおし）（鮨処すさび湯 専用）。料理名を金箔の文字として置き、箔にツヤ（ハイライト）が
// スッと横切る＝箔押し印刷の質感。写真主役・余白は静か。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const HK_BODY = 480;
const HK_OPEN = STORY_OPEN + 30;
const HK_END = STORY_END - 30;
export const YHAKUWA_DUR = HK_OPEN + HK_BODY + HK_END;

const HakuWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = HK_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 96, 1080 - SAFE.side * 2 - 20, 44);
  const desc = it.desc || typoHeadline;
  // 箔のツヤが左→右へ横切る（0→1 でハイライト位置が動く）
  const shine = interpolate(seg.local, [8, 52], [-40, 140], { ...clamp, easing: EASE });
  const goldGrad = "linear-gradient(96deg, #8A6A2E 0%, #E8CE86 " + Math.max(0, shine - 18) + "%, #FFF6D8 " + shine + "%, #E8CE86 " + Math.min(100, shine + 18) + "%, #9A7734 100%)";

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.03} brightness={0.94} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0.05) 30%, rgba(10,8,6,0.1) 52%, rgba(10,8,6,0.86) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 上：鮨処すさび湯 */}
      <div style={{ position: "absolute", top: SAFE.top - 62, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 25, letterSpacing: 6, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>鮨処すさび湯</div>
      </div>

      {/* 下：金箔の料理名（背景clipで箔＋ツヤ）＋説明文 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 244, ...rise(seg.local, 8, { dist: 16, blur: 4 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 12, opacity: 0.9 }}>{it.sub || "SUSHI"}</div>
        <div style={{
          fontFamily: mincho, fontSize: nameSize, fontWeight: 700, letterSpacing: 3, whiteSpace: "nowrap",
          backgroundImage: goldGrad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 2px rgba(216,179,106,0.5))",
        }}>{one}</div>
        <div style={{ marginTop: 14, width: 120, height: 2, background: "linear-gradient(90deg," + T.line + "," + T.accent + ")", opacity: 0.9 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 42), maxWidth: 800 }}>
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

export const YoshokuHakuWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YHAKUWA_DUR - 30, YHAKUWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={HK_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={HK_OPEN} /></Sequence>
      <Sequence from={HK_OPEN} durationInFrames={HK_BODY}><HakuWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={HK_OPEN + HK_BODY - STORY_XF} durationInFrames={HK_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
