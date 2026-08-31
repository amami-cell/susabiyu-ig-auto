// 洋食⑥ワインと共に：料理＋2枚目写真を対で見せ「この一皿にこの一杯」。肉バルのペアリング提案。
// 2枚目が無ければ1枚目を流用。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YWINE_DUR = Y_DUR;

export const YoshokuWine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YWINE_DUR;
  const T = ytheme(theme);
  const a = typoPhotos[0] || { src: "", caption: "" };
  const b = typoPhotos[1] || a;

  const topO = interpolate(f, [4, 22], [0, 1], clamp);
  const topY = interpolate(f, [4, 24], [-40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const botO = interpolate(f, [16, 34], [0, 1], clamp);
  const botY = interpolate(f, [16, 36], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const zA = interpolate(f, [0, DUR], [1.06, 1.14], clamp);
  const zB = interpolate(f, [0, DUR], [1.14, 1.06], clamp);
  const midO = interpolate(f, [40, 60], [0, 1], clamp);
  const ampW = interpolate(f, [44, 74], [0, 120], { ...clamp, easing: Easing.out(Easing.cubic) });
  const capO = interpolate(f, [64, 86], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 42, DUR - 26], [0, 1], clamp);
  const nA = oneLineFont(a.caption, 760, 46, 2, 30);
  const nB = oneLineFont(b.caption, 760, 46, 2, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 上：料理 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 900, overflow: "hidden", opacity: topO, transform: "translateY(" + topY + "px)" }}>
        <Img src={staticFile(a.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + zA + ")" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 40%, " + T.base + "EE 100%)" }} />
        <div style={{ position: "absolute", left: 96, bottom: 40, opacity: capO }}>
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 6 }}>DISH</div>
          <div style={{ fontFamily: mincho, color: T.ink, fontSize: nA, fontWeight: 600, letterSpacing: 2 }}>{a.caption}</div>
        </div>
      </div>

      {/* 下：もう一皿/一杯 */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 900, overflow: "hidden", opacity: botO, transform: "translateY(" + botY + "px)" }}>
        <Img src={staticFile(b.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + zB + ")" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 40%, " + T.base + "EE 100%)" }} />
        <div style={{ position: "absolute", left: 96, top: 40, opacity: capO }}>
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 6 }}>PAIRING</div>
          <div style={{ fontFamily: mincho, color: T.ink, fontSize: nB, fontWeight: 600, letterSpacing: 2 }}>{b.caption}</div>
        </div>
      </div>

      {/* 中央：ペアリングのアンパサンド */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: midO }}>
        <div style={{ width: ampW, height: 1, background: T.line, marginBottom: 18 }} />
        <div style={{ width: 120, height: 120, borderRadius: "50%", border: "1.5px solid " + T.accent, background: T.base + "CC", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 64 }}>&amp;</div>
        </div>
        <div style={{ width: ampW, height: 1, background: T.line, marginTop: 18 }} />
        <div style={{ marginTop: 16, fontFamily: mincho, color: T.sub, fontSize: 26, letterSpacing: 3 }}>{typoHeadline}</div>
      </AbsoluteFill>

      {/* フッター（中央下・小） */}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{storeName} · {handle}</div>
      </div>
    </AbsoluteFill>
  );
};
