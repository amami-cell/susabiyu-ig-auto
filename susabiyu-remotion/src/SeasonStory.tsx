import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const PETAL = "#f7c6d2";
const PETAL2 = "#f29bb4";
const WHITE = "#fbf6ee";
const GOLD = "#cBA15a";
const DUR = 240;          // 約8秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const PETALS = Array.from({ length: 18 }, (_, i) => i);

// 季節の旬：料理に桜の花びらが舞う、季節感のある一品紹介。
export const SeasonStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const zoom = interpolate(f, [0, DUR], [1.0, 1.08], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.12, 1.24], clamp);
  const titleO = interpolate(f, [12, 28], [0, 1], clamp);
  const titleY = interpolate(f, [12, 30], [26, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [38, 54], [0, 1], clamp);
  const nameY = interpolate(f, [38, 56], [38, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 820, 78, 4, 44);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e0b08" }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />
      {/* 料理（切らず全体表示・通常→アップ。背景は同じ写真の明るめぼかしで全面を埋める＝余白を作らない） */}
      <AbsoluteFill style={{ backgroundColor: "#0e0b08" }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.72)", transform: "scale(" + bgScale + ")" }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(40,20,40,0.4) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0) 46%, rgba(20,10,12,0.34) 64%, rgba(20,10,12,0.9) 100%)" }} />
      </AbsoluteFill>

      {/* 舞う花びら */}
      {PETALS.map((i) => {
        const span = 2120;
        const yy = ((f * (2.4 + (i % 5) * 0.5) + i * 140) % span) - 120;
        const xx = (i * 61) % 1080 + Math.sin((f + i * 33) * 0.035) * 46;
        const rot = (f * (1.6 + (i % 3)) + i * 40) % 360;
        const sc = 0.7 + (i % 4) * 0.18;
        const col = i % 2 ? PETAL2 : PETAL;
        return (
          <div key={i} style={{ position: "absolute", left: xx, top: yy, width: 26 * sc, height: 34 * sc, background: "linear-gradient(160deg," + col + "," + PETAL2 + ")", borderRadius: "60% 60% 60% 0", opacity: 0.9, transform: "rotate(" + rot + "deg)", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }} />
        );
      })}

      {/* 見出し */}
      <div style={{ position: "absolute", top: 150, left: 0, width: "100%", textAlign: "center", opacity: titleO, transform: "translateY(" + titleY + "px)" }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 56, letterSpacing: 12, textShadow: "0 3px 14px rgba(0,0,0,0.5)" }}>旬、はじまる。</div>
        <div style={{ display: "inline-block", marginTop: 18, color: "#2a2017", background: "rgba(247,198,210,0.92)", fontFamily: mincho, fontWeight: 700, fontSize: 28, letterSpacing: 8, padding: "7px 24px", borderRadius: 999 }}>季節の一品</div>
      </div>

      {/* 料理名 */}
      <div style={{ position: "absolute", bottom: 240, left: 80, right: 80, opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ width: 110, height: 5, backgroundColor: GOLD, marginBottom: 20 }} />
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: nm, letterSpacing: 4, whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>{hero.caption}</div>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 120, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontSize: 28, letterSpacing: 5 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const SEASON_DUR = DUR;
