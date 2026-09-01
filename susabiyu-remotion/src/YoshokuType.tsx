// 洋食⑨大見出しタイポ：写真を背景に暗く敷き、超特大のセリフ体タイポで一言。インパクト重視の告知回。
// 「肉。」「本日入荷。」等。ヘッドラインを主役にする。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YTYPE_DUR = Y_DUR;

export const YoshokuType: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YTYPE_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  const bgZ = interpolate(f, [0, DUR], [1.1, 1.22], clamp);
  const bgO = interpolate(f, [0, 20], [0, 0.42], clamp);
  const bigO = interpolate(f, [10, 30], [0, 1], clamp);
  const bigY = interpolate(f, [10, 34], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const bigLS = interpolate(f, [10, 40], [22, 6], { ...clamp, easing: Easing.out(Easing.cubic) });
  const lineW = interpolate(f, [40, 70], [0, 320], { ...clamp, easing: Easing.out(Easing.cubic) });
  const subO = interpolate(f, [58, 78], [0, 1], clamp);
  const nameO = interpolate(f, [78, 98], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 24], [0, 1], clamp);
  // ヘッドラインは大きく。文字数に応じてサイズ自動調整（画面幅940想定）。
  const bigSize = oneLineFont(typoHeadline, 940, 150, 6, 64);
  const nameSize = oneLineFont(hero.caption, 900, 44, 3, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart||0)*30)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 背景写真（暗め） */}
      <AbsoluteFill style={{ opacity: bgO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + bgZ + ")", filter: "brightness(0.6) saturate(1.05)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + "E6 0%, " + T.base + "99 40%, " + T.base + "CC 100%)" }} />

      {/* 上ラベル */}
      <div style={{ position: "absolute", top: 160, left: 0, right: 0, textAlign: "center", opacity: subO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 32, letterSpacing: 12, fontWeight: 600 }}>{T.label}</div>
      </div>

      {/* 超特大タイポ */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: bigSize, fontWeight: 700, letterSpacing: bigLS, textAlign: "center", lineHeight: 1.15, opacity: bigO, transform: "translateY(" + bigY + "px)", textShadow: "0 4px 30px rgba(0,0,0,0.6)", padding: "0 60px" }}>{typoHeadline}</div>
        <div style={{ marginTop: 30, width: lineW, height: 3, background: T.accent }} />
      </AbsoluteFill>

      {/* 料理名（小・下） */}
      <div style={{ position: "absolute", bottom: 220, left: 0, right: 0, textAlign: "center", opacity: nameO }}>
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: nameSize, letterSpacing: 3 }}>{hero.caption}</div>
      </div>

      {/* フッター */}
      <div style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 36, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 6, fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
