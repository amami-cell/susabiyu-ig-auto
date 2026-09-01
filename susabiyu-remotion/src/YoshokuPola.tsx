// 洋食⑧ポラロイド重ね：複数の料理をポラロイド風に少しずつ回転・重ねて登場。
// カジュアルで「みんなでシェア」な肉バルの賑わい感。写真が足りなければ先頭を流用。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YPOLA_DUR = Y_DUR;

export const YoshokuPola: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YPOLA_DUR;
  const T = ytheme(theme);
  const p0 = typoPhotos[0] || { src: "", caption: "" };
  const cards = [p0, typoPhotos[1] || p0, typoPhotos[2] || p0, typoPhotos[3] || p0];
  // 4枚をずらして重ねる（位置・回転・登場タイミング）
  const layout = [
    { x: -150, y: -260, rot: -8, cap: cards[0] },
    { x: 165, y: -120, rot: 7, cap: cards[1] },
    { x: -120, y: 210, rot: 5, cap: cards[2] },
    { x: 175, y: 360, rot: -6, cap: cards[3] },
  ];
  const headO = interpolate(f, [4, 22], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 42, DUR - 26], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart||0)*30)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.8, 0.8, 0], clamp)} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 40%, " + T.base + " 0%, " + T.footBase + " 100%)" }} />

      {/* 上部ラベル */}
      <div style={{ position: "absolute", top: 130, left: 0, right: 0, textAlign: "center", opacity: headO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 10, fontWeight: 600 }}>{T.label}</div>
        <div style={{ marginTop: 10, fontFamily: mincho, color: T.sub, fontSize: 30, letterSpacing: 3 }}>{typoHeadline}</div>
      </div>

      {/* ポラロイド4枚 */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {layout.map((L, i) => {
          const start = 18 + i * 16;
          const o = interpolate(f, [start, start + 16], [0, 1], clamp);
          const pop = interpolate(f, [start, start + 18], [0.7, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
          const yy = interpolate(f, [start, start + 20], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          const nameSize = oneLineFont(L.cap.caption, 380, 30, 1, 22);
          return (
            <div key={i} style={{ position: "absolute", transform: "translate(" + L.x + "px," + (L.y + yy) + "px) rotate(" + L.rot + "deg) scale(" + pop + ")", opacity: o }}>
              <div style={{ width: 440, background: "#FBF7EE", padding: "18px 18px 0", borderRadius: 4, boxShadow: "0 24px 50px rgba(0,0,0,0.55)" }}>
                <div style={{ width: 404, height: 404, overflow: "hidden", background: "#000" }}>
                  <Img src={staticFile(L.cap.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: mincho, color: "#2a2420", fontSize: nameSize, fontWeight: 600, letterSpacing: 1 }}>{L.cap.caption}</div>
                </div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* フッター */}
      <div style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 36, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 6, fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
