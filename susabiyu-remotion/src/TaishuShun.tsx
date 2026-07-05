// 大衆・季節の旬：烏丸「季節の旬」(SeasonStory)の構成（一品全体表示＋舞う花びら）
// そのままに、しっとり明朝 → 太筆×白フチ＋黄札＋朱帯の大衆トーンへ。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const PETAL = "#f7c6d2";
const PETAL2 = "#f29bb4";
export const TSHUN_DUR = 240;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const PETALS = Array.from({ length: 18 }, (_, i) => i);

export const TaishuShun: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const DUR = TSHUN_DUR;
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const zoom = interpolate(f, [0, DUR], [1.0, 1.08], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.12, 1.24], clamp);
  const titleO = interpolate(f, [12, 24], [0, 1], clamp);
  const titleS = interpolate(f, [12, 22], [1.8, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tagS = interpolate(f, [26, 32], [2.2, 1], clamp);
  const tagO = f >= 26 ? 1 : 0;
  const nameO = interpolate(f, [44, 58], [0, 1], clamp);
  const nameY = interpolate(f, [44, 60], [38, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 760, 64, 2, 38);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a0c06" }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.82, 0.82, 0], clamp)} />
      {/* 料理（切らず全体表示・じわズーム）。背景は同写真の暖色ボカシ */}
      <AbsoluteFill style={{ backgroundColor: "#1a0c06" }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.72) saturate(1.35)", transform: "scale(" + bgScale + ")" }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")", filter: "saturate(1.1) contrast(1.04)" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(26,12,6,0.5) 0%, rgba(26,12,6,0.06) 22%, rgba(0,0,0,0) 46%, rgba(26,12,6,0.34) 64%, rgba(26,12,6,0.92) 100%)" }} />
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

      {/* 見出し（太筆×白フチ＋黄札） */}
      <div style={{ position: "absolute", top: 140, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ color: SHIRO, fontFamily: fude, fontSize: 84, letterSpacing: 4, transform: "scale(" + titleS + ")", ...fuchi(KURO, 6) }}>旬、入りました！</div>
        <div style={{ marginTop: 20, opacity: tagO, transform: "scale(" + tagS + ") rotate(-2deg)", display: "inline-block" }}>
          <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "8px 26px",
            color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 36, boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>季節の一品</span>
        </div>
      </div>

      {/* 料理名（朱帯） */}
      <div style={{ position: "absolute", bottom: 240, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8, padding: "16px 44px",
          transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: nm, letterSpacing: 2, whiteSpace: "nowrap" }}>{hero.caption}</span>
        </div>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 120, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <span style={{ color: SHIRO, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>{storeName}　{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
