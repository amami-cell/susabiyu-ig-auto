// 洋食①本日の一皿：ブランドの“顔”。左上にロゴのマストヘッド、中央に額装した一皿、左下に料理名。
// エディトリアル・グリッド（左揃え）で「良い店だ」と一目で伝える静かな導入。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW,
  Grain, Vignette, WarmGlow, DishStage, Masthead, splitLines, heroSize,
} from "./yoshokuDesign";

export const YOSHOKU_DUR = 390; // 13s

export const YoshokuDish: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YOSHOKU_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const lines = splitLines(hero.caption);
  const nameSize = heroSize(hero.caption, 94, 60);
  const ruleW = drawW(f, 56, 108, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 主役ステージ（額装カード＋暗ぼかし背景） */}
      <DishStage srcs={[hero.src]} total={DUR} base={T.base} accent={T.accent} cardW={846} cardH={846} cardTop={430} />
      <Vignette strength={0.38} />
      <WarmGlow />
      <Grain />

      {/* 左上：ロゴのマストヘッド＋ラテンのキッカー */}
      <Masthead storeName={storeName} kicker={T.label} accent={T.accent} f={f} />

      {/* 左下：料理名（明朝・大・最大2行）＋短い金の罫／ハンドル。左揃えのエディトリアル。 */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(f, 50, { dist: 26, blur: 6 }) }}>
        <div style={{ width: ruleW, height: 2, background: T.accent, opacity: 0.9, marginBottom: 22 }} />
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 700, letterSpacing: 1, lineHeight: 1.18, textShadow: "0 3px 22px rgba(0,0,0,0.55)" }}>
          {lines.length ? lines.map((ln, i) => <div key={i}>{ln}</div>) : hero.caption}
        </div>
        <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
