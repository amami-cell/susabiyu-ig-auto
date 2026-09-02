// 洋食①本日の一皿：料理を額装カードで“全体”を上品に見せ、料理名を主役に大きく（最大2行）。
// 役割＝ブランドの顔（1枚目）。静かな導入で「良い店だ」と一目で感じさせる。
// 変更点: 上の余白に店舗ロゴ／説明文（弱いキャッチ）は排除／料理名を主役化／13秒。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, fade,
  Grain, Vignette, WarmGlow, DishStage, StoreLogo, Kicker, splitLines, heroSize,
} from "./yoshokuDesign";

export const YOSHOKU_DUR = 390; // 13s @30fps

export const YoshokuDish: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YOSHOKU_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const lines = splitLines(hero.caption);
  const nameSize = heroSize(hero.caption, 96, 62);
  const underW = drawW(f, 74, 210, 34);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 主役ステージ（額装カード＋暗ぼかし背景） */}
      <DishStage srcs={[hero.src]} total={DUR} base={T.base} accent={T.accent} line={T.line} cardW={862} cardH={980} cardTop={452} />
      <Vignette strength={0.42} />
      <WarmGlow />
      <Grain />

      {/* 上：店舗ロゴ（横型）＋ラテンのキッカー */}
      <div style={{ position: "absolute", top: SAFE.top - 96, left: 0, right: 0, display: "flex", justifyContent: "center", ...rise(f, 8, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={58} />
      </div>
      <div style={{ position: "absolute", top: SAFE.top + 6, left: 0, right: 0 }}>
        <Kicker text={T.label} color={T.accent} f={f} start={18} />
      </div>

      {/* 主役：料理名（明朝・大・最大2行）＋短い金の下線 */}
      <div style={{ position: "absolute", top: 1500, left: SAFE.side, right: SAFE.side, textAlign: "center", ...rise(f, 52, { dist: 26, blur: 8 }) }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 700, letterSpacing: 3, lineHeight: 1.24, textShadow: "0 3px 22px rgba(0,0,0,0.55)" }}>
          {lines.length ? lines.map((ln, i) => <div key={i}>{ln}</div>) : hero.caption}
        </div>
        <div style={{ margin: "28px auto 0", width: underW, height: 2, background: T.accent, opacity: 0.95 }} />
      </div>

      {/* 締め：ハンドルのみ（ロゴは上に置いたので重複させない） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 128, textAlign: "center", opacity: fade(f, DUR - 70) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 6 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
