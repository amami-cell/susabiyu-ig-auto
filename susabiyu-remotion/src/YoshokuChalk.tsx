// 洋食②黒板トラットリア：黒板テクスチャに白チョーク風のセリフ体で料理名＋価格風の一言。
// 写真は右下に小さく添える。ビストロの日替わり黒板の質感（和風要素なし）。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YCHALK_DUR = Y_DUR;

export const YoshokuChalk: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YCHALK_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  const frameO = interpolate(f, [4, 20], [0, 1], clamp);
  const chalkO = interpolate(f, [22, 40], [0, 1], clamp);
  const chalkW = interpolate(f, [24, 56], [0, 300], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [44, 62], [0, 1], clamp);
  const nameY = interpolate(f, [44, 64], [22, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const photoO = interpolate(f, [70, 92], [0, 1], clamp);
  const photoZ = interpolate(f, [70, DUR], [1.05, 1.14], clamp);
  const footO = interpolate(f, [DUR - 44, DUR - 28], [0, 1], clamp);
  const nameSize = oneLineFont(hero.caption, 760, 96, 3, 44);

  return (
    <AbsoluteFill style={{ backgroundColor: "#14181a", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.8, 0.8, 0], clamp)} />
      {/* 黒板テクスチャ（濃緑〜黒のグラデ＋粉っぽいノイズ影） */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 30%, #1f2a26 0%, #12181a 55%, #0b0f10 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.06, background: "repeating-linear-gradient(115deg, #ffffff 0 1px, transparent 1px 6px)" }} />

      {/* 木枠風の外枠（生成り/金の細ライン） */}
      <div style={{ position: "absolute", inset: 54, border: "3px solid " + T.line, borderRadius: 8, opacity: frameO * 0.85 }} />
      <div style={{ position: "absolute", inset: 70, border: "1px solid " + T.accent, borderRadius: 6, opacity: frameO * 0.5 }} />

      {/* 上部ラベル */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", opacity: chalkO }}>
        <div style={{ fontFamily: serif, fontStyle: "italic", color: "#EFEDE4", fontSize: 44, letterSpacing: 6 }}>Oggi · 本日の黒板</div>
        <div style={{ margin: "20px auto 0", width: chalkW, height: 2, background: "#EFEDE4", opacity: 0.8 }} />
      </div>

      {/* 料理名（白チョーク風・大） */}
      <div style={{ position: "absolute", top: 360, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ fontFamily: mincho, color: "#F4F2EA", fontSize: nameSize, fontWeight: 600, letterSpacing: 4, textShadow: "0 1px 0 rgba(255,255,255,0.25), 0 3px 16px rgba(0,0,0,0.5)" }}>{hero.caption}</div>
        <div style={{ marginTop: 22, fontFamily: mincho, color: T.accent, fontSize: 38, letterSpacing: 3 }}>{typoHeadline}</div>
      </div>

      {/* 写真：中央に額装風で添える */}
      <div style={{ position: "absolute", top: 640, left: 190, width: 700, height: 760, opacity: photoO }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", border: "6px solid #EFEDE4", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + photoZ + ")" }} />
        </div>
      </div>

      {/* フッター */}
      <div style={{ position: "absolute", bottom: 110, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: "#F4F2EA", fontSize: 40, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 8, fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
