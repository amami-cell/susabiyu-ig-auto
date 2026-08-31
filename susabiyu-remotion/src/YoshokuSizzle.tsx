// 洋食③鉄板ジュ〜っと：肉写真を大きく、湯気/火の粉パーティクルを重ねてゆっくりズームイン。
// 「肉」を主役にした食欲喚起型（ステーキ・肉盛り向け）。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing, random } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YSIZZLE_DUR = Y_DUR;

export const YoshokuSizzle: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YSIZZLE_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  const zoom = interpolate(f, [0, DUR], [1.28, 1.05], clamp); // 寄りから引き（迫力→全体）
  const heroO = interpolate(f, [0, 16], [0, 1], clamp);
  const labelO = interpolate(f, [26, 44], [0, 1], clamp);
  const nameO = interpolate(f, [64, 84], [0, 1], clamp);
  const nameY = interpolate(f, [64, 86], [30, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const underW = interpolate(f, [84, 110], [0, 240], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 44, DUR - 28], [0, 1], clamp);
  const nameSize = oneLineFont(hero.caption, 900, 84, 3, 44);

  // 立ちのぼる湯気/火の粉パーティクル（決定的乱数で軽量）
  const parts = new Array(16).fill(0).map((_, i) => {
    const seed = "sz" + i;
    const x = random(seed + "x") * 1080;
    const speed = 0.5 + random(seed + "s") * 0.9;
    const yy = 1500 - ((f * speed * 8 + random(seed + "o") * 1500) % 1600);
    const size = 4 + random(seed + "z") * 8;
    const op = 0.10 + random(seed + "p") * 0.22;
    return { x, yy, size, op };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0806", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* 主役：肉写真をほぼ全画面（引きズーム） */}
      <AbsoluteFill style={{ opacity: heroO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + zoom + ")", filter: "saturate(1.12) contrast(1.06)" }} />
      </AbsoluteFill>
      {/* 上下を暗く締めて文字を乗せる */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.10) 58%, rgba(0,0,0,0.86) 100%)" }} />

      {/* 湯気/火の粉 */}
      {parts.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p.x, top: p.yy, width: p.size, height: p.size, borderRadius: "50%", background: "#FFE7B0", opacity: p.op, filter: "blur(1px)" }} />
      ))}

      {/* 上部ラベル */}
      <div style={{ position: "absolute", top: 130, left: 0, right: 0, textAlign: "center", opacity: labelO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 12, fontWeight: 600 }}>SIZZLE · 焼きたて</div>
      </div>

      {/* 料理名（下・大）＋金の下線 */}
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: nameSize, fontWeight: 700, letterSpacing: 4, textShadow: "0 3px 22px rgba(0,0,0,0.7)" }}>{hero.caption}</div>
        <div style={{ margin: "22px auto 0", width: underW, height: 3, background: T.accent }} />
        <div style={{ marginTop: 20, fontFamily: mincho, color: "#F0E4CC", fontSize: 34, letterSpacing: 3 }}>{typoHeadline}</div>
      </div>

      {/* フッター */}
      <div style={{ position: "absolute", bottom: 100, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: 36, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 6, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
