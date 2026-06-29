import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const INK = "#3a2c1c";
const RED = "#b3382e";
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ポラロイド：料理写真がポラロイド写真みたいにパシャッと落ちて並ぶ（賑やか・カジュアル）。
const PW = 430;
const POS = [
  { l: 96, t: 330, r: -5 }, { l: 554, t: 330, r: 6 },
  { l: 96, t: 830, r: 4 }, { l: 554, t: 830, r: -6 },
  { l: 96, t: 1330, r: -4 }, { l: 554, t: 1330, r: 5 },
];
const PER = 22;
const N = Math.min(tempoPhotos.length, 6);
const DUR = 24 + N * PER + 86;

export const Polaroid: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const prints = tempoPhotos.slice(0, 6);
  const titleO = interpolate(f, [0, 14], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 30%, #efe2cb 0%, #e3d2b3 55%, #d2bd95 100%)" }}>
      <Audio src={staticFile(tempoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* 写真プリント */}
      {prints.map((p, i) => {
        const pos = POS[i];
        const s = 14 + i * PER;
        const ty = interpolate(f, [s, s + 16, s + 24], [-680, 24, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
        const sc = interpolate(f, [s, s + 16], [0.88, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const o = interpolate(f, [s, s + 8], [0, 1], clamp);
        const fs = oneLineFont(p.caption, 358, 30, 1, 18);
        return (
          <div key={i} style={{ position: "absolute", left: pos.l, top: pos.t, width: PW, opacity: o, transform: "translateY(" + ty + "px) scale(" + sc + ") rotate(" + pos.r + "deg)", transformOrigin: "center center" }}>
            <div style={{ background: "#fbf7ef", padding: "16px 16px 0 16px", borderRadius: 4, boxShadow: "0 18px 34px rgba(40,28,12,0.34)" }}>
              <div style={{ width: PW - 32, height: 372, overflow: "hidden", background: "#222" }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: INK, fontFamily: mincho, fontWeight: 700, fontSize: fs, letterSpacing: 1, whiteSpace: "nowrap" }}>{p.caption}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* 上のマスキングテープ風タイトル */}
      <div style={{ position: "absolute", top: 96, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <span style={{ display: "inline-block", background: RED, color: "#fbf3e2", fontFamily: mincho, fontWeight: 700, fontSize: 40, letterSpacing: 10, padding: "12px 40px", borderRadius: 4, transform: "rotate(-2deg)", boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}>本日の品、ぜんぶ。</span>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 70, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ display: "inline-block", background: "rgba(58,44,28,0.9)", color: "#fbf3e2", fontFamily: mincho, fontWeight: 700, fontSize: 30, letterSpacing: 5, padding: "10px 30px", borderRadius: 999 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const POLAROID_DUR = DUR;
