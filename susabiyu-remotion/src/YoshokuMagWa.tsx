// 和・スタイリッシュ雑誌（鮨処すさび湯 専用）。
// 洋食④/⑪の雑誌テンプレを、和モダンの上質誌面に作り替えた版。
//   ・墨地(base)に「細い明朝の大見出し」＋広い余白＝高級和食誌のカバーの質感。
//   ・写真は全ブリードではなく“額装”（金の極細罫で囲む）＝誌面らしい間。
//   ・上に小さな欧文＋「鮨 献立」マストヘッド、下に 欧文サブ→料理名→金の短罫→料理説明文。
//   ・折々の丁数を漢数字（其の一…）で添える＝雑誌のノンブル。
// 他店には使わない（karasuma の patterns だけが参照）。OP/CLOSE は既存の誌面案(v9)を流用。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines, Grain, StoreLogo, PhotoLayer, Slides, fitOneLine, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MAGWA_BODY = 480;                 // 16s
const MAGWA_OPEN = STORY_OPEN + 60;     // 表紙をしっかり見せる（5.0秒）
const MAGWA_END = STORY_END - 60;       // 3.0秒
export const YMAGWA_DUR = MAGWA_OPEN + MAGWA_BODY + MAGWA_END;   // 720 = 24.0秒

const KANSUJI = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const folio = (n: number): string => KANSUJI[n] || String(n);

const MagWaBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan",
}) => {
  const f = useCurrentFrame();
  const DUR = MAGWA_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const seg = segNow(DUR, 4, f);
  const it = items[seg.i];
  const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");
  const nameSize = fitOneLine(one, 96, 1080 - SAFE.side * 2, 40);
  const desc = it.desc || typoHeadline;
  // 上部マストヘッドの細罫を左から引く
  const ruleTop = interpolate(f, [10, 46], [0, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + " 0%, " + T.footBase + " 100%)" }} />

      {/* マストヘッド：欧文(左)＋「鮨 献立」(右)、下に細罫 */}
      <div style={{ position: "absolute", top: SAFE.top - 78, left: SAFE.side, right: SAFE.side, display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: fade(f, 12) }}>
        <div style={{ fontFamily: serif, color: T.sub, fontSize: 24, letterSpacing: 9, fontWeight: 500 }}>{T.label}</div>
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: 25, letterSpacing: 7 }}>鮨　献立</div>
      </div>
      <div style={{ position: "absolute", top: SAFE.top - 30, left: SAFE.side, right: SAFE.side, height: 1, background: T.line, opacity: 0.55, transform: "scaleX(" + ruleTop + ")", transformOrigin: "left" }} />

      {/* 額装写真（4品クロスフェード）：金の極細罫で囲む＝誌面の“間” */}
      <div style={{ position: "absolute", top: 168, left: SAFE.side, right: SAFE.side, height: 1090, overflow: "hidden", border: "1px solid " + T.line, boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
        <Slides count={4} total={DUR} render={(i, local, segd) => (
          <PhotoLayer src={items[i].src} frame={local} dur={segd} from={1.02} to={1.08} sat={1.04} />
        )} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.28) 100%)" }} />
        {/* 丁数（ノンブル）を写真の左下角に小さく */}
        <div style={{ position: "absolute", left: 22, bottom: 20, fontFamily: serif, color: "#FFFFFF", fontSize: 25, letterSpacing: 2, opacity: 0.82, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>其の{folio(seg.i + 1)}</div>
      </div>
      <Grain opacity={0.045} />

      {/* 下：欧文サブ → 料理名（細明朝の大見出し）→ 金の短罫 → 料理説明文 */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 246 }}>
        <div key={seg.i} style={{ ...rise(seg.local, 6, { dist: 20, blur: 5 }) }}>
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 9, textTransform: "uppercase", fontWeight: 500, marginBottom: 16 }}>{it.sub || "SUSHI"}</div>
          <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 500, letterSpacing: 3, lineHeight: 1.2, whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,0.4)" }}>{one}</div>
        </div>
        <div style={{ marginTop: 22, width: 118, height: 1, background: T.accent, opacity: 0.85 * fade(f, 30) }} />
        <div style={{ marginTop: 20, opacity: fade(f, 40) }}>
          <div style={{ fontFamily: mincho, color: T.sub, letterSpacing: 1.5, lineHeight: 1.5, fontSize: fitLines(desc, 40, 1080 - SAFE.side * 2, 26) }}>
            {splitLines(desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
      </div>

      {/* フッター：店舗ロゴ＋ハンドル（右下・常時） */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 78, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, ...rise(f, 16, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={104} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuMagWa: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "鮨処すさび湯", handle = "@susabiyu_kyoto", theme = "wamodan", openText = "",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YMAGWA_DUR - 30, YMAGWA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={MAGWA_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={MAGWA_OPEN} /></Sequence>
      <Sequence from={MAGWA_OPEN} durationInFrames={MAGWA_BODY}><MagWaBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={MAGWA_OPEN + MAGWA_BODY - STORY_XF} durationInFrames={MAGWA_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
