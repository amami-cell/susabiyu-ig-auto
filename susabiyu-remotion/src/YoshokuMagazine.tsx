// 洋食⑪雑誌ストーリー：OP/CLOSE案9（雑誌の表紙／裏表紙）と本編まで同じ“紙の誌面”で揃えた1本。
// 他テンプレが暗い画面の上に写真を敷くのに対し、これは終始クリームの紙の上に誌面を組む。
//   表紙(OP) → 本文ページ(4品を1ページずつ) → 裏表紙(CLOSE)
// 本文の各ページは「柱＋ノンブル → 白フチの写真 → 欧文サブ → 料理名 → 罫 → 説明文」の順。
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, fade, rise, Grain, Slides, fitOneLine, fitLines, splitLines, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MAGZ_BODY = 480; // 16s（4品×4s）
export const YMAGZ_DUR = STORY_OPEN + MAGZ_BODY + STORY_END;

// 案9と同じ紙の色（表紙・本文・裏表紙で同一にすることで“一冊”に見せる）
const PAPER = "#F3E7CF";
const PAPER_D = "#E7D5B2";
const INK = "#241A12";

const MagazineBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = MAGZ_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const { i, local } = segNow(DUR, 4, f);
  const cur = items[i];
  const nm = (cur.disp && cur.disp.length) ? cur.disp : cur.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");                     // 料理名は必ず1行
  const nameSize = fitOneLine(one, 74, 1080 - 232, 30);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 34%, " + PAPER + " 0%, " + PAPER_D + " 100%)", fontFamily: mincho }}>
      {/* 紙の織り目＋誌面の二重罫（表紙・裏表紙とまったく同じ作法） */}
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      <div style={{ position: "absolute", inset: 44, border: "2px solid rgba(150,110,70,0.4)" }} />
      <div style={{ position: "absolute", inset: 60, border: "1px solid rgba(150,110,70,0.26)" }} />

      {/* 柱（誌名）とノンブル（ページ番号）＝雑誌の本文ページの約束事 */}
      <div style={{ position: "absolute", top: 118, left: 116, right: 116, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 6, 20) }}>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</span>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 4 }}>{"0" + (i + 1)} / 04</span>
      </div>
      <div style={{ position: "absolute", top: 158, left: 116, right: 116, height: 1, background: "rgba(176,72,31,0.4)", opacity: fade(f, 8, 20) }} />

      {/* 写真：白フチで囲って“誌面に貼った写真”に。4品をクロスフェードで送る。 */}
      <div style={{ position: "absolute", left: 116, right: 116, top: 210, height: 820 }}>
        <div style={{ position: "absolute", inset: 0, background: "#FBF5E9", padding: 18, boxShadow: "0 26px 60px rgba(60,35,14,0.30)" }}>
          <div style={{ position: "absolute", inset: 18, overflow: "hidden" }}>
            <Slides count={4} total={DUR} render={(k, lf, seg) => {
              const z = interpolate(lf, [0, seg], [1.0, 1.05], clamp);
              return items[k].src ? (
                <Img src={staticFile(items[k].src)} style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  transform: "scale(" + z + ")", filter: "brightness(1.06) saturate(1.12) contrast(1.04)",
                }} />
              ) : null;
            }} />
          </div>
        </div>
      </div>

      {/* 本文：欧文サブ → 料理名 → 罫 → 説明文（カット毎に差し替え） */}
      <div key={i} style={{ position: "absolute", left: 116, right: 116, top: 1092, ...rise(local, 4, { dist: 18 }) }}>
        {cur.sub ? (
          <div style={{ fontFamily: serif, color: T.slab, fontSize: 26, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>{cur.sub}</div>
        ) : null}
        <div style={{ fontFamily: mincho, color: INK, fontSize: nameSize, fontWeight: 700, letterSpacing: 2, lineHeight: 1.16, whiteSpace: "nowrap" }}>{one}</div>
        <div style={{ width: 96, height: 3, background: T.slab, margin: "20px 0 18px" }} />
        {cur.desc ? (
          <div style={{
            fontFamily: mincho, color: "rgba(36,26,18,0.82)", letterSpacing: 1, lineHeight: 1.5,
            fontSize: fitLines(cur.desc, 34, 1080 - 232, 20),
          }}>
            {splitLines(cur.desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        ) : null}
      </div>

      {/* 奥付の帯（表紙・裏表紙と対） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: T.slab, opacity: fade(f, 10, 22) }} />
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 14, 22) }}>
        <span style={{ fontFamily: mincho, color: "#FDF6EA", fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>{storeName}</span>
        <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 4 }}>{handle}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

export const YoshokuMagazine: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian", openText = "",
}) => (
  <AbsoluteFill style={{ backgroundColor: PAPER }}>
    {/* 音楽は表紙〜本文〜裏表紙に通す */}
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)}
      volume={(ff) => interpolate(ff, [0, 16, YMAGZ_DUR - 30, YMAGZ_DUR], [0, 0.8, 0.8, 0], clamp)} />
    <Sequence durationInFrames={STORY_OPEN}>
      <StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} />
    </Sequence>
    <Sequence from={STORY_OPEN} durationInFrames={MAGZ_BODY}>
      <MagazineBody storeName={storeName} handle={handle} theme={theme} />
    </Sequence>
    <Sequence from={STORY_OPEN + MAGZ_BODY - STORY_XF} durationInFrames={STORY_END + STORY_XF}>
      <StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} />
    </Sequence>
  </AbsoluteFill>
);
