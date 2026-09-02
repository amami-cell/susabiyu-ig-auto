// 洋食③焼きたて：主菜を主役に4品をゆっくりクロスフェード。熱の“気配”だけをごく薄く重ねる。
// エディトリアル・グリッド（左上ロゴ／左下料理名）。寄りすぎない画で一皿の全体を見せる中盤。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, random } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW,
  Grain, Vignette, Masthead, PhotoLayer, Slides, splitLines, heroSize, segNow,
} from "./yoshokuDesign";

export const YSIZZLE_DUR = 480; // 16s

export const YoshokuSizzle: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YSIZZLE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  // 控えめな火の粉（決定的乱数）
  const parts = new Array(9).fill(0).map((_, i) => {
    const seed = "sz" + i;
    const x = random(seed + "x") * 1080;
    const speed = 0.4 + random(seed + "s") * 0.7;
    const yy = 1560 - ((f * speed * 7 + random(seed + "o") * 1600) % 1700);
    const size = 3 + random(seed + "z") * 5;
    const op = 0.05 + random(seed + "p") * 0.12;
    return { x, yy, size, op };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0806", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* 主役：4品フルブリード（ズーム抑制で全体が見える） */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.03} to={1.09} sat={1.1} brightness={1.0} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 24%, rgba(0,0,0,0.12) 54%, rgba(0,0,0,0.9) 100%)" }} />
      {parts.map((pt, i) => (
        <div key={i} style={{ position: "absolute", left: pt.x, top: pt.yy, width: pt.size, height: pt.size, borderRadius: "50%", background: "#FFE7B0", opacity: pt.op, filter: "blur(1px)" }} />
      ))}
      <Vignette strength={0.46} />
      <Grain />

      {/* 左上：ロゴのマストヘッド */}
      <Masthead storeName={storeName} kicker={T.label} accent={T.accent} tint="#FFF6E6" f={f} />

      {/* 左下：料理名＝カットごとに“1件だけ”表示（左揃え・重ねない） */}
      {(() => {
        const { i, local } = segNow(DUR, 4, f);
        const it = items[i]; const lines = splitLines(it.caption);
        const sz = heroSize(it.caption, 90, 58);
        return (
          <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(local, 6, { dist: 22, blur: 6 }) }}>
            <div style={{ width: drawW(local, 12, 100, 24), height: 2, background: T.accent, marginBottom: 20 }} />
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, textShadow: "0 3px 24px rgba(0,0,0,0.75)" }}>
              {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : it.caption}
            </div>
            <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
