// 和・金箔ひとすじ（鮨処すさび湯 専用）。金の細線がスッと走り、料理名が現れるミニマル演出。
// 無駄を削いだ高級感。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const KIN_BODY = 480;
const KIN_OPEN = STORY_OPEN + 30;
const KIN_END = STORY_END - 30;
export const YKINSUJIWA_DUR = KIN_OPEN + KIN_BODY + KIN_END;

const KinsujiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = KIN_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 84, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  const sweep = interpolate(seg.local, [6, 34], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.04} to={1.10} sat={1.04} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0) 26%, rgba(10,8,6,0) 52%, rgba(10,8,6,0.82) 100%)" }} />
      <Grain opacity={0.05} />

      {/* 下：金の細線（左から走る）→ 料理名 → 説明文 ※左上の店名表記は削除 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 250 }}>
        <div style={{ height: 2, width: (1080 - SAFE.side * 2) * sweep, background: "linear-gradient(90deg," + T.line + "," + T.accent + ")", boxShadow: "0 0 12px rgba(216,179,106,0.5)", marginBottom: 22 }} />
        <div style={{ ...rise(seg.local, 8, { dist: 16, blur: 4 }) }}>
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>{it.sub || "SUSHI"}</div>
          <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>{one}</div>
        </div>
        <div style={{ marginTop: 16, opacity: fade(f, 42), maxWidth: 780 }}>
          <div style={{ fontFamily: mincho, color: "#F1E7D2", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.7)", fontSize: fitLines(desc, 38, 780, 26) }}>
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

export const YoshokuKinsujiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YKINSUJIWA_DUR - 30, YKINSUJIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={KIN_OPEN}><StoryOpenV v={8} storeName={storeName} theme={theme} openText={openText} dur={KIN_OPEN} /></Sequence>
      <Sequence from={KIN_OPEN} durationInFrames={KIN_BODY}><KinsujiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={KIN_OPEN + KIN_BODY - STORY_XF} durationInFrames={KIN_END + STORY_XF}><StoryEndV v={8} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
