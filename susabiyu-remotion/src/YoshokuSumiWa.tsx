// 和・水墨（すいぼく）（鮨処すさび湯 専用）。墨のにじみ(ソフトなヴィネット)で料理が静かに巡る。
// 動きは最小＝格のある“間”。料理名の下に墨の刷毛(ソフトバー)。写真主役。OP/CLOSEは誌面案(v9)。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, fitOneLine, Grain, StoreLogo, PhotoLayer, Slides, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const SUMI_BODY = 480;
const SUMI_OPEN = STORY_OPEN + 30;
const SUMI_END = STORY_END - 30;
export const YSUMIWA_DUR = SUMI_OPEN + SUMI_BODY + SUMI_END;

const SumiWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = SUMI_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 82, 1080 - SAFE.side * 2 - 40, 40);
  const desc = it.desc || typoHeadline;
  const brush = interpolate(seg.local, [8, 40], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.03} to={1.09} sat={1.0} />
        )} />
      </AbsoluteFill>
      {/* 墨のにじみ：四隅を沈める柔らかいヴィネット＋下の墨 */}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 240px 40px rgba(8,6,4,0.72)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,6,4,0.4) 0%, rgba(8,6,4,0) 30%, rgba(8,6,4,0) 55%, rgba(8,6,4,0.8) 100%)" }} />
      <Grain opacity={0.06} />

      {/* 下：料理名＋墨の刷毛＋説明文（左寄せ）※上部の店名表記は削除 */}
      <div key={seg.i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 236, ...rise(seg.local, 6, { dist: 16, blur: 6 }) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", marginBottom: 12, opacity: 0.9 }}>{it.sub || "SUSHI"}</div>
        <div style={{ fontFamily: mincho, color: "#FBF5E7", fontSize: nameSize, fontWeight: 500, letterSpacing: 3, whiteSpace: "nowrap", textShadow: "0 2px 20px rgba(0,0,0,0.7)" }}>{one}</div>
        {/* 墨の刷毛（左から引く・ソフトなにじみ） */}
        <div style={{ marginTop: 16, height: 10, width: 260 * brush, background: "linear-gradient(90deg, rgba(20,14,10,0.9), rgba(20,14,10,0))", filter: "blur(3px)", borderRadius: 6 }} />
        <div style={{ marginTop: 14, opacity: fade(f, 40), maxWidth: 760 }}>
          <div style={{ fontFamily: mincho, color: "#EFE3CC", letterSpacing: 1.5, lineHeight: 1.5, textShadow: "0 2px 14px rgba(0,0,0,0.8)", fontSize: fitLines(desc, 38, 760, 26) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>
      {/* 右下：ロゴ＋ハンドル */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={92} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
      {/* 1品目の入り：OPからの急な切替を避け、地色からふわ〜っと開く（2品目以降と揃える） */}
      <AbsoluteFill style={{ backgroundColor: T.base, opacity: interpolate(f, [0, 20], [1, 0], clamp), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const YoshokuSumiWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YSUMIWA_DUR - 30, YSUMIWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={SUMI_OPEN}><StoryOpenV v={1} storeName={storeName} theme={theme} openText={openText} dur={SUMI_OPEN} /></Sequence>
      <Sequence from={SUMI_OPEN} durationInFrames={SUMI_BODY}><SumiWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={SUMI_OPEN + SUMI_BODY - STORY_XF} durationInFrames={SUMI_END + STORY_XF}><StoryEndV v={1} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
