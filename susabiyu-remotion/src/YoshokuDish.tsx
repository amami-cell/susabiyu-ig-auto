// 洋食①本日の一皿：ブランドの“顔”。左上にロゴのマストヘッド、中央に額装した一皿、左下に料理名。
// 4品を上品にクロスフェードで巡らせ、料理名(disp＝承認済み改行)＋欧文サブ＋短句をカット毎に切替。
// オープニング(STORY_OPEN)＋本編(DISH_BODY)＋エンドロール(STORY_END)を Sequence で連結。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, segNow,
  Grain, Vignette, WarmGlow, DishStage, Masthead, fitOneLine, fitLines, splitLines,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
// OP/CLOSEはテンプレごとに固定の案を使う（本日の一皿：料理が主役なので“一皿から引く”で始める）。
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const DISH_BODY = 420; // 14s（4品×約3.5s）
export const YOSHOKU_DUR = STORY_OPEN + DISH_BODY + STORY_END;

const DishBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = DISH_BODY;
  const T = ytheme(theme);
  const photos = (typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "" }]).slice(0, 4);
  const srcs = photos.map((p) => p.src);
  const { i, local } = segNow(DUR, photos.length, f);
  const cur = photos[i] || { caption: "", story: "", sub: "", disp: "" };
  const nm = (cur.disp && cur.disp.length) ? cur.disp : cur.caption;
  const one = (nm || "").replace(/[｜\n]/g, "");                    // 料理名は必ず1行
  const nameSize = fitOneLine(one, 96, 1080 - SAFE.side * 2, 34);
  const ruleW = drawW(f, 56, 108, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      {/* 主役ステージ（額装カード＋暗ぼかし背景）：4品をクロスフェードで巡回 */}
      <DishStage srcs={srcs} total={DUR} base={T.base} accent={T.accent} cardW={846} cardH={846} cardTop={430} />
      <Vignette strength={0.38} />
      <WarmGlow />
      <Grain />

      {/* 左上：ロゴのマストヘッド＋ラテンのキッカー（文字ロゴを大きく） */}
      <Masthead storeName={storeName} kicker={T.label} accent={T.accent} f={f} logoH={116} />


      {/* 左下：欧文サブ＋料理名（明朝・特大・最大2行）＋短い金の罫＋短句／ハンドル。カット毎に差し替え。 */}
      <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(local, 4, { dist: 24, blur: 6 }) }}>
        <div style={{ width: ruleW, height: 2, background: T.accent, opacity: 0.9, marginBottom: 18 }} />
        {cur.sub ? <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{cur.sub}</div> : null}
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, whiteSpace: "nowrap", textShadow: "0 3px 22px rgba(0,0,0,0.55)" }}>{one}</div>
        {/* 短句(story)は廃止。料理の説明文(desc)を必ず1行で置く。 */}
        {cur.desc ? (
          <div style={{
            marginTop: 14, fontFamily: mincho, color: T.sub, letterSpacing: 1, opacity: 0.96,
            lineHeight: 1.42, textShadow: "0 2px 14px rgba(0,0,0,0.5)",
            fontSize: fitLines(cur.desc, 36, 1080 - SAFE.side * 2 - 20, 22),
          }}>
            {splitLines(cur.desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuDish: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      {/* 音楽は全体（オープニング〜本編〜エンドロール）に通す */}
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YOSHOKU_DUR - 30, YOSHOKU_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={STORY_OPEN}><StoryOpenV v={5} storeName={storeName} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN} durationInFrames={DISH_BODY}><DishBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN + DISH_BODY - STORY_XF} durationInFrames={STORY_END + STORY_XF}><StoryEndV v={5} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
