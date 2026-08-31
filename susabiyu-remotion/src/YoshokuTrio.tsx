// 洋食⑦おすすめ3品スライド：前菜→メイン→〆の3枚を横スライドで順に紹介。金の番号(01/02/03)付き。
// コース感・品数の多さを一気見せ。写真が足りなければ先頭を流用。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing, Sequence } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YTRIO_DUR = Y_DUR;
const SEG = Math.floor(Y_DUR / 3);

const Slide: React.FC<{ ph: { src: string; caption: string }; no: string; T: ReturnType<typeof ytheme> }> = ({ ph, no, T }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 14, SEG - 14, SEG], [0, 1, 1, 0], clamp);
  const x = interpolate(f, [0, 18], [70, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const z = interpolate(f, [0, SEG], [1.08, 1.16], clamp);
  const nameSize = oneLineFont(ph.caption, 860, 66, 3, 40);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ transform: "translateX(" + x + "px)" }}>
        <Img src={staticFile(ph.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.8) 100%)" }} />
      {/* 大きな番号 */}
      <div style={{ position: "absolute", top: 150, left: 96 }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 150, fontWeight: 600, lineHeight: 1, textShadow: "0 3px 20px rgba(0,0,0,0.6)" }}>{no}</div>
        <div style={{ marginTop: 6, width: 90, height: 3, background: T.accent }} />
      </div>
      {/* 料理名（下） */}
      <div style={{ position: "absolute", bottom: 240, left: 96, right: 96 }}>
        <div style={{ fontFamily: mincho, color: "#FFF8EC", fontSize: nameSize, fontWeight: 700, letterSpacing: 3, textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}>{ph.caption}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuTrio: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YTRIO_DUR;
  const T = ytheme(theme);
  const p0 = typoPhotos[0] || { src: "", caption: "" };
  const items = [p0, typoPhotos[1] || p0, typoPhotos[2] || typoPhotos[1] || p0];
  const nos = ["01", "02", "03"];
  const headO = interpolate(f, [0, 16], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 24], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />
      {items.map((ph, i) => (
        <Sequence key={i} from={i * SEG} durationInFrames={SEG}>
          <Slide ph={ph} no={nos[i]} T={T} />
        </Sequence>
      ))}
      {/* 常時オーバーレイ：上のラベル・下の店名 */}
      <div style={{ position: "absolute", top: 130, right: 96, textAlign: "right", opacity: headO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 8 }}>{T.label}</div>
        <div style={{ fontFamily: mincho, color: "#EDE4D2", fontSize: 26, letterSpacing: 3, marginTop: 4 }}>本日のおすすめ3品</div>
      </div>
      <div style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: "#FFF8EC", fontSize: 34, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 6, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
