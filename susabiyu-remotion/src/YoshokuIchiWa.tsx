// 和・一行（いちぎょう）（鮨処すさび湯 専用）。全面写真に、料理名をただ一行の縦書きで凛と置く極ミニマル。
// 余白＝間（ま）。装飾を削ぎ、写真と一行だけで“格”を出す。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const IC_BODY = 480;
const IC_OPEN = STORY_OPEN + 30;
const IC_END = STORY_END - 30;
export const YICHIWA_DUR = IC_OPEN + IC_BODY + IC_END;

const vsize = (s: string): number => {
  const n = (s || "").replace(/[｜\s]/g, "").length;
  if (n <= 4) return 96; if (n <= 6) return 82; if (n <= 8) return 70; if (n <= 11) return 56; return 46;
};

const IchiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = IC_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const desc = it.desc || typoHeadline;

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.05} to={1.11} sat={1.04} />
        )} />
      </AbsoluteFill>
      {/* 本編の入り：地色から素早くふわっと立ち上げる（1品目が出るまで待たせない・でも滑らか） */}
      <AbsoluteFill style={{ backgroundColor: T.base, opacity: interpolate(f, [0, 10], [1, 0], clamp), pointerEvents: "none" }} />
      {/* ごく控えめな四隅の沈み＝文字を浮かせる最小限だけ */}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,6,4,0.5) 0%, rgba(8,6,4,0) 34%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,6,4,0.28) 0%, rgba(8,6,4,0) 24%, rgba(8,6,4,0) 66%, rgba(8,6,4,0.6) 100%)" }} />
      <Grain opacity={0.045} />

      {/* 上：鮨処すさび湯（極小・左上） */}
      <div style={{ position: "absolute", top: SAFE.top - 60, left: SAFE.side, opacity: fade(f, 12) }}>
        <div style={{ fontFamily: mincho, color: "#F4EDDD", fontSize: 23, letterSpacing: 7, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>鮨処すさび湯</div>
      </div>

      {/* 中央左寄り：一行の縦書き（金の短い天点＋名）。1品目が出るまで待たせないよう素早く滑らかに立ち上げる。 */}
      <div key={seg.i} style={{ position: "absolute", top: 420, left: SAFE.side + 8, ...rise(seg.local, 1, { dist: 14, blur: 3, dur: 20 }) }}>
        <div style={{ width: 8, height: 8, borderRadius: 8, background: T.accent, marginBottom: 20, boxShadow: "0 0 10px rgba(216,179,106,0.6)" }} />
        <div style={{ writingMode: "vertical-rl", fontFamily: mincho, color: "#FCF6E8", fontSize: vsize(one), fontWeight: 500, letterSpacing: 8, lineHeight: 1.2, textShadow: "0 2px 22px rgba(0,0,0,0.7)" }}>{one}</div>
      </div>

      {/* 左下：金の短罫＋説明文（控えめ） */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 210, opacity: fade(f, 44) }}>
        <div style={{ width: 84, height: 1, background: T.accent, opacity: 0.85, marginBottom: 16 }} />
        <div style={{ fontFamily: mincho, color: "#EFE3CC", letterSpacing: 1.6, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.8)", fontSize: fitLines(desc, 34, 820, 24) }}>
          {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
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

export const YoshokuIchiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YICHIWA_DUR - 30, YICHIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={IC_OPEN}><StoryOpenV v={2} storeName={storeName} theme={theme} openText={openText} dur={IC_OPEN} /></Sequence>
      <Sequence from={IC_OPEN} durationInFrames={IC_BODY}><IchiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={IC_OPEN + IC_BODY - STORY_XF} durationInFrames={IC_END + STORY_XF}><StoryEndV v={2} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
