import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const WHITE = "#fbf4e7";
const GOLD = "#e3bd6e";
const DUR = 240;          // 約8秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const STEAM = Array.from({ length: 12 }, (_, i) => i);

// 湯気の一皿：温かい料理に湯気がふわっと立つ。屋号「すさび"湯"」に掛けた温かみ演出。料理は切らず全体表示。
export const Yuge: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const zoom = interpolate(f, [0, DUR], [1.0, 1.08], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.12, 1.24], clamp);
  const titleO = interpolate(f, [14, 30], [0, 1], clamp);
  const titleY = interpolate(f, [14, 32], [24, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [40, 56], [0, 1], clamp);
  const nameY = interpolate(f, [40, 58], [38, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 820, 78, 4, 44);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0a06" }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 料理（切らず全体表示・通常→アップ。背景は明るめぼかしで全面を埋める） */}
      <AbsoluteFill style={{ backgroundColor: "#0d0a06" }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.72)", transform: "scale(" + bgScale + ")" }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")" }} />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* 立ちのぼる湯気 */}
      {STEAM.map((i) => {
        const span = 1280;
        const sp = 1.3 + (i % 4) * 0.42;
        const life = ((f * sp + i * 116) % span) / span;
        const yy = 1200 - life * span;
        const xx = 320 + ((i * 53) % 420) + Math.sin((f + i * 37) * 0.04) * 46;
        const sc = 0.6 + life * 1.5;
        const op = Math.sin(life * Math.PI) * 0.34;
        return (
          <div key={i} style={{ position: "absolute", left: xx, top: yy, width: 150 * sc, height: 200 * sc, background: "radial-gradient(circle at 50% 50%, rgba(255,250,240,0.9), rgba(255,250,240,0))", filter: "blur(13px)", opacity: op }} />
        );
      })}

      {/* 暖色オーバーレイ＋下グラデ */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 64%, rgba(255,176,80,0.16) 0%, rgba(0,0,0,0) 46%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(20,12,4,0.5) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0) 46%, rgba(20,12,4,0.4) 66%, rgba(12,8,4,0.92) 100%)" }} />

      {/* 見出し */}
      <div style={{ position: "absolute", top: 142, left: 0, width: "100%", textAlign: "center", opacity: titleO, transform: "translateY(" + titleY + "px)" }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 58, letterSpacing: 12, textShadow: "0 3px 16px rgba(0,0,0,0.6)" }}>あったかいうちに。</div>
        <div style={{ display: "inline-block", marginTop: 18, color: "#3a2410", background: "rgba(227,189,110,0.94)", fontFamily: mincho, fontWeight: 700, fontSize: 28, letterSpacing: 8, padding: "7px 26px", borderRadius: 999 }}>湯気の一皿</div>
      </div>

      {/* 料理名 */}
      <div style={{ position: "absolute", bottom: 240, left: 80, right: 80, opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ width: 110, height: 5, backgroundColor: GOLD, marginBottom: 20 }} />
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: nm, letterSpacing: 4, whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>{hero.caption}</div>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 120, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontSize: 28, letterSpacing: 5 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YUGE_DUR = DUR;
