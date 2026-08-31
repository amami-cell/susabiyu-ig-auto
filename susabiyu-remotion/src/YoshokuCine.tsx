// 洋食⑤シネマ・フルスクリーン：写真を全画面＋上下シネマバー、ゆっくりパン。中央に一行キャッチ。
// ワイン・前菜など「雰囲気」を売る回。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YCINE_DUR = Y_DUR;

export const YoshokuCine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YCINE_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  // シネマバーが上下から入り（レターボックス）→ ゆっくり横パン
  const barH = interpolate(f, [0, 24], [0, 210], { ...clamp, easing: Easing.out(Easing.cubic) });
  const panX = interpolate(f, [0, DUR], [-40, 40], clamp);
  const zoom = interpolate(f, [0, DUR], [1.14, 1.2], clamp);
  const keyO = interpolate(f, [40, 62], [0, 1], clamp);
  const keyY = interpolate(f, [40, 64], [24, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const lineW = interpolate(f, [60, 90], [0, 260], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [96, 116], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 24], [0, 1], clamp);
  const nameSize = oneLineFont(hero.caption, 900, 60, 3, 36);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 16, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 全画面写真（ゆっくり横パン＋微ズーム） */}
      <AbsoluteFill>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "translateX(" + panX + "px) scale(" + zoom + ")", filter: "saturate(1.05) contrast(1.04)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)" }} />

      {/* 上下シネマバー */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barH, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barH, background: "#000" }} />

      {/* 中央：一行キャッチ */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: keyO, transform: "translateY(" + keyY + "px)" }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 10, marginBottom: 22 }}>{T.label}</div>
        <div style={{ fontFamily: mincho, color: "#FFFFFF", fontSize: 56, fontWeight: 600, letterSpacing: 6, textAlign: "center", textShadow: "0 2px 24px rgba(0,0,0,0.7)" }}>{typoHeadline}</div>
        <div style={{ marginTop: 26, width: lineW, height: 2, background: T.accent, opacity: 0.9 }} />
      </AbsoluteFill>

      {/* 下バーの上：料理名（小・字幕風） */}
      <div style={{ position: "absolute", bottom: barH + 26, left: 0, right: 0, textAlign: "center", opacity: nameO }}>
        <div style={{ fontFamily: mincho, color: "#F2ECDD", fontSize: nameSize, letterSpacing: 3, textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}>{hero.caption}</div>
      </div>

      {/* 下バー内：店名 */}
      <div style={{ position: "absolute", bottom: Math.max(30, (barH - 60) / 2), left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 6 }}>{storeName} · {handle}</div>
      </div>
    </AbsoluteFill>
  );
};
