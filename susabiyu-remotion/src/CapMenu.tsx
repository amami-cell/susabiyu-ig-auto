// CapCut参考③「FOOD / menu」風：暗めのメニューカード。上部にサムネ帯＋
// オレンジの選択枠が移動し、選ばれた料理が大きく入れ替わる。タイトルは1字ずつ。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadScript } from "@remotion/google-fonts/DancingScript";
import { pick, capNormal } from "./capData";

const { fontFamily: sans } = loadSans();
const { fontFamily: script } = loadScript();
const TITLE = 55;
const PER = 62;
const END = 45;
const DISHES = pick(5, 1);
export const CAP3_DUR = TITLE + DISHES.length * PER + END;
const ORANGE = "#ff7a1a";
const THUMB_W = 176;
const GAP = 22;
const STRIP_X = (1080 - (DISHES.length * THUMB_W + (DISHES.length - 1) * GAP)) / 2;

export const CapMenu: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const shown = Math.floor(interpolate(f, [6, 30], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const menuO = interpolate(f, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const idxF = (f - TITLE) / PER;
  const idx = Math.max(0, Math.min(DISHES.length - 1, Math.floor(idxF)));
  const inDish = f >= TITLE;
  // 選択枠は各切替でスッと移動
  const selX = interpolate(idxF, [idx - 0.12, idx], [Math.max(0, idx - 1) * (THUMB_W + GAP), idx * (THUMB_W + GAP)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const local = (f - TITLE) - idx * PER;
  const heroO = interpolate(local, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const heroS = interpolate(local, [0, 12], [1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const endO = interpolate(f, [CAP3_DUR - END, CAP3_DUR - END + 14, CAP3_DUR - 8, CAP3_DUR], [1, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#17181c", opacity: Math.min(fadeIn, endO) }}>
      <Audio src={staticFile(capNormal)} volume={(v) => interpolate(v, [0, 15, CAP3_DUR - 20, CAP3_DUR], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      {/* タイトル：FOOD が1字ずつ＋menu 筆記体 */}
      <div style={{ position: "absolute", top: 96, width: "100%", textAlign: "center" }}>
        <div style={{ color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 108, letterSpacing: 20 }}>{"FOOD".slice(0, shown)}</div>
        <div style={{ color: "rgba(255,255,255,0.55)", fontFamily: script, fontSize: 66, marginTop: -18, opacity: menuO }}>menu</div>
      </div>
      {/* サムネ帯＋オレンジ選択枠 */}
      <div style={{ position: "absolute", top: 330, left: STRIP_X, height: 130, opacity: inDish ? 1 : 0 }}>
        {DISHES.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: i * (THUMB_W + GAP), width: THUMB_W, height: 124, borderRadius: 12, overflow: "hidden", opacity: i === idx ? 1 : 0.55 }}>
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
        <div style={{ position: "absolute", left: selX, width: THUMB_W, height: 124, borderRadius: 12, border: "5px solid " + ORANGE, boxShadow: "0 0 24px rgba(255,122,26,0.5)" }} />
      </div>
      {/* 大きい料理カード（選択と連動して入れ替わる） */}
      {inDish && (
        <div style={{ position: "absolute", top: 520, left: 90, width: 900, height: 1100, borderRadius: 22, overflow: "hidden", opacity: heroO, transform: "scale(" + heroS + ")", boxShadow: "0 34px 90px rgba(0,0,0,0.6)" }}>
          <Img src={staticFile(DISHES[idx].src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "60px 34px 26px", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 100%)", color: "#fff", fontFamily: sans, fontWeight: 700, fontSize: 44, textAlign: "center" }}>
            {DISHES[idx].caption}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 76, width: "100%", textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: sans, fontSize: 28, letterSpacing: 4 }}>{handle}</div>
    </AbsoluteFill>
  );
};
