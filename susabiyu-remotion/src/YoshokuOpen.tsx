// 洋食⑩本日OPEN／今夜どうぞ：料理＋営業案内（OPEN時刻／ご予約はプロフィールから）。
// 金の細ラインで囲んだ集客テンプレ。毎日の開店案内に。openText/slots は props で差し替え可。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YOPEN_DUR = Y_DUR;

export const YoshokuOpen: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string; reserveText?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
  openText = "OPEN 17:00", reserveText = "ご予約はプロフィールのリンクから",
}) => {
  const f = useCurrentFrame();
  const DUR = YOPEN_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  const heroO = interpolate(f, [0, 16], [0, 1], clamp);
  const heroZ = interpolate(f, [0, DUR], [1.08, 1.18], clamp);
  const frameO = interpolate(f, [16, 34], [0, 1], clamp);
  const openO = interpolate(f, [30, 50], [0, 1], clamp);
  const openScale = interpolate(f, [30, 52], [0.8, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const lineW = interpolate(f, [48, 78], [0, 260], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tonightO = interpolate(f, [56, 76], [0, 1], clamp);
  const resvO = interpolate(f, [84, 104], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 24], [0, 1], clamp);
  const heroName = oneLineFont(hero.caption, 800, 40, 2, 28);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 背景：料理写真＋暗幕 */}
      <AbsoluteFill style={{ opacity: heroO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + heroZ + ")", filter: "brightness(0.72) saturate(1.05)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + "CC 0%, " + T.base + "55 34%, " + T.base + "66 60%, " + T.base + "F2 100%)" }} />

      {/* 金の細枠 */}
      <div style={{ position: "absolute", inset: 72, border: "1.5px solid " + T.accent, borderRadius: 8, opacity: frameO * 0.85 }} />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", opacity: frameO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 32, letterSpacing: 12, fontWeight: 600 }}>{T.label}</div>
      </div>

      {/* 中央：OPEN */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: serif, color: "#FFFFFF", fontSize: 120, fontWeight: 700, letterSpacing: 8, opacity: openO, transform: "scale(" + openScale + ")", textShadow: "0 4px 26px rgba(0,0,0,0.7)" }}>{openText}</div>
        <div style={{ marginTop: 24, width: lineW, height: 2, background: T.accent }} />
        <div style={{ marginTop: 24, fontFamily: mincho, color: "#F4ECDB", fontSize: 44, fontWeight: 600, letterSpacing: 4, opacity: tonightO, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{typoHeadline}</div>
      </AbsoluteFill>

      {/* 下：料理名＋予約案内 */}
      <div style={{ position: "absolute", bottom: 210, left: 0, right: 0, textAlign: "center", opacity: resvO }}>
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: heroName, letterSpacing: 3, marginBottom: 16 }}>本日の一皿：{hero.caption}</div>
        <div style={{ display: "inline-block", padding: "12px 30px", border: "1px solid " + T.line, borderRadius: 999 }}>
          <span style={{ fontFamily: mincho, color: T.accent, fontSize: 30, letterSpacing: 2 }}>{reserveText}</span>
        </div>
      </div>

      {/* フッター */}
      <div style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: "#FFFFFF", fontSize: 36, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 6, fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
