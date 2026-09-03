// 洋食①本日の一皿：ブランドの“顔”。左上にロゴのマストヘッド、中央に額装した一皿、左下に料理名。
// 4品を上品にクロスフェードで巡らせ（＝メニューの幅が一目で伝わる）、料理名＋ストーリー用の一言を
// カット毎に切り替える（文字は常に1件だけ＝二重表示なし）。エディトリアル・グリッド（左揃え）。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, segNow,
  Grain, Vignette, WarmGlow, DishStage, Masthead, SampleBadge, splitLines, heroSize,
} from "./yoshokuDesign";

export const YOSHOKU_DUR = 420; // 14s（4品×約3.5s）

export const YoshokuDish: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YOSHOKU_DUR;
  const T = ytheme(theme);
  const photos = (typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "" }]).slice(0, 4);
  const srcs = photos.map((p) => p.src);
  const { i, local } = segNow(DUR, photos.length, f);
  const cur = photos[i] || { caption: "", story: "" };
  const lines = splitLines(cur.caption);
  const nameSize = heroSize(cur.caption, 90, 56);
  const ruleW = drawW(f, 56, 108, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 主役ステージ（額装カード＋暗ぼかし背景）：4品をクロスフェードで巡回 */}
      <DishStage srcs={srcs} total={DUR} base={T.base} accent={T.accent} cardW={846} cardH={846} cardTop={430} />
      <Vignette strength={0.38} />
      <WarmGlow />
      <Grain />

      {/* 左上：ロゴのマストヘッド＋ラテンのキッカー */}
      <Masthead storeName={storeName} kicker={T.label} accent={T.accent} f={f} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

      {/* 左下：料理名（明朝・大・最大2行）＋短い金の罫＋ストーリー用の一言／ハンドル。カット毎に差し替え。 */}
      <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(local, 4, { dist: 24, blur: 6 }) }}>
        <div style={{ width: ruleW, height: 2, background: T.accent, opacity: 0.9, marginBottom: 22 }} />
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 700, letterSpacing: 1, lineHeight: 1.18, textShadow: "0 3px 22px rgba(0,0,0,0.55)" }}>
          {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : cur.caption}
        </div>
        {cur.story ? (
          <div style={{ marginTop: 14, fontFamily: mincho, color: T.sub, fontSize: 34, letterSpacing: 2, opacity: 0.96, textShadow: "0 2px 14px rgba(0,0,0,0.5)" }}>{cur.story}</div>
        ) : null}
        <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
