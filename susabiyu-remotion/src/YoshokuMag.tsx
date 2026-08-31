// 洋食④雑誌エディトリアル：左に大きな余白＋縦組みの見出し、右に料理写真。ファッション誌風の上品レイアウト。
// 「今月のおすすめ」「季節の一皿」向け。和風要素なし。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { ytheme, yclamp as clamp, Y_DUR } from "./yoshokuTheme";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YMAG_DUR = Y_DUR;

export const YoshokuMag: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YMAG_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  const photoO = interpolate(f, [4, 22], [0, 1], clamp);
  const photoX = interpolate(f, [4, 26], [60, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const photoZ = interpolate(f, [0, DUR], [1.05, 1.15], clamp);
  const numO = interpolate(f, [20, 40], [0, 1], clamp);
  const nameO = interpolate(f, [40, 62], [0, 1], clamp);
  const nameY = interpolate(f, [40, 64], [30, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const barH = interpolate(f, [30, 70], [0, 300], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tagO = interpolate(f, [72, 92], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 44, DUR - 28], [0, 1], clamp);
  const nameSize = oneLineFont(hero.caption, 300, 96, 6, 46);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.8, 0.8, 0], clamp)} />
      {/* 生成りの紙面ベース */}
      <AbsoluteFill style={{ background: "linear-gradient(160deg, " + T.base + " 0%, " + T.footBase + " 100%)" }} />

      {/* 右：料理写真（縦長・誌面いっぱい） */}
      <div style={{ position: "absolute", top: 150, right: 70, width: 620, height: 1120, opacity: photoO, transform: "translateX(" + photoX + "px)" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 4, boxShadow: "0 30px 70px rgba(0,0,0,0.5)" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + photoZ + ")" }} />
        </div>
      </div>

      {/* 左：ナンバリング＋縦の金バー */}
      <div style={{ position: "absolute", top: 190, left: 96, opacity: numO }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 8 }}>{T.label}</div>
        <div style={{ marginTop: 8, fontFamily: serif, color: T.sub, fontSize: 24, letterSpacing: 6 }}>SIGNATURE No.01</div>
      </div>
      <div style={{ position: "absolute", top: 300, left: 100, width: 3, height: barH, background: T.line }} />

      {/* 左：縦組みの見出し（雑誌風・大） */}
      <div style={{ position: "absolute", top: 340, left: 150, height: 760, writingMode: "vertical-rl", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 600, letterSpacing: 8, textShadow: "0 2px 16px rgba(0,0,0,0.4)" }}>{hero.caption}</div>
      </div>

      {/* 左下：ヘッドライン（横） */}
      <div style={{ position: "absolute", bottom: 210, left: 96, width: 330, opacity: tagO }}>
        <div style={{ width: 60, height: 2, background: T.accent, marginBottom: 16 }} />
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: 30, letterSpacing: 2, lineHeight: 1.7 }}>{typoHeadline}</div>
      </div>

      {/* フッター（左） */}
      <div style={{ position: "absolute", bottom: 96, left: 96, opacity: footO }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 34, letterSpacing: 5, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 6, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
