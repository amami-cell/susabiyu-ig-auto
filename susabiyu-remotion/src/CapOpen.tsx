// CapCut参考②「We Are OPEN」風：明るい編集写真＋黒い丸枠の営業案内テロップ。
// 左＝ヒーロー写真と営業時間、右＝料理写真が縦にスクロールし続けるフィード。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadScript } from "@remotion/google-fonts/DancingScript";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { pick, capNormal } from "./capData";
import { Cine } from "./cine";

const { fontFamily: script } = loadScript();
const { fontFamily: serif } = loadSerif();
export const CAP2_DUR = 380;
const HERO = pick(2, 0);
const FEED = pick(8, 2);
const CELL = 480;                     // 右列の写真1枚の高さ
const COL_H = FEED.length * CELL;     // 1周ぶんの高さ

export const CapOpen: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const inO = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const outO = interpolate(f, [CAP2_DUR - 14, CAP2_DUR], [1, 0], { extrapolateLeft: "clamp" });
  const scroll = (f * 1.7) % COL_H;   // 右列は等速で無限ループ
  const blobS = interpolate(f, [8, 26], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
  const blobO = interpolate(f, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const heroZ = interpolate(f, [0, CAP2_DUR], [1.0, 1.08]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#f4efe8", opacity: Math.min(inO, outO) }}>
      <Audio src={staticFile(capNormal)} volume={(v) => interpolate(v, [0, 15, CAP2_DUR - 20, CAP2_DUR], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine>
      {/* 左：ヒーロー写真2枚（上大・下小） */}
      <div style={{ position: "absolute", left: 26, top: 26, width: 610, height: 1180, borderRadius: 22, overflow: "hidden", boxShadow: "0 18px 50px rgba(60,40,20,0.25)" }}>
        <Img src={staticFile(HERO[0].src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + heroZ + ")" }} />
      </div>
      <div style={{ position: "absolute", left: 26, top: 1232, width: 610, height: 662, borderRadius: 22, overflow: "hidden", boxShadow: "0 18px 50px rgba(60,40,20,0.25)" }}>
        <Img src={staticFile(HERO[1].src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {/* 右：縦スクロールする写真フィード（2周ぶん重ねてシームレスループ） */}
      <div style={{ position: "absolute", left: 662, top: 0, width: 392, height: 1920, overflow: "hidden" }}>
        <div style={{ transform: "translateY(" + -scroll + "px)" }}>
          {[...FEED, ...FEED].map((p, i) => (
            <div key={i} style={{ width: 392, height: CELL - 14, margin: "0 0 14px", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 30px rgba(60,40,20,0.2)" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      </div>
      {/* 黒い丸枠の営業テロップ */}
      <div style={{ position: "absolute", left: 60, top: 830, transform: "scale(" + blobS + ")", transformOrigin: "left center", opacity: blobO, background: "rgba(12,12,12,0.92)", borderRadius: 34, padding: "44px 54px", textAlign: "center", boxShadow: "0 24px 70px rgba(0,0,0,0.35)" }}>
        <div style={{ color: "#fff", fontFamily: script, fontSize: 64, lineHeight: 1 }}>We Are</div>
        <div style={{ color: "#fff", fontFamily: serif, fontWeight: 800, fontSize: 120, lineHeight: 1.05, letterSpacing: 4 }}>OPEN</div>
        <div style={{ color: "rgba(255,255,255,0.9)", fontFamily: serif, fontSize: 40, marginTop: 14, letterSpacing: 2 }}>16:00 - 24:00</div>
      </div>
      <div style={{ position: "absolute", top: 40, left: 60, color: "#1c1c1c", fontFamily: serif, fontWeight: 700, fontSize: 30, letterSpacing: 2, background: "rgba(255,255,255,0.85)", borderRadius: 12, padding: "8px 18px", boxShadow: "0 8px 26px rgba(0,0,0,0.18)" }}>{handle}</div>
      </Cine>
    </AbsoluteFill>
  );
};
