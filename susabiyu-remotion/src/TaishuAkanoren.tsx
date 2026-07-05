// 大衆・暖簾くぐり：烏丸「暖簾くぐり」(NorenStory)の動き（暖簾が持ち上がって
// 奥の料理が見える来店体験）そのままに、紺の上品暖簾 → 朱赤の大衆暖簾へ。
// 文字は太筆＋白フチ、挨拶は「いらっしゃい！」。提灯は使わない。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
export const TANOREN_DUR = 240;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const TaishuAkanoren: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const DUR = TANOREN_DUR;
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const zoom = interpolate(f, [0, DUR], [1.0, 1.08], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.12, 1.24], clamp);
  const norenTextO = interpolate(f, [0, 10, 36, 50], [0, 1, 1, 0], clamp);
  const welcomeO = interpolate(f, [86, 96], [0, 1], clamp);
  const welcomeS = interpolate(f, [86, 94], [2.0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [104, 118], [0, 1], clamp);
  const nameY = interpolate(f, [104, 120], [36, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 760, 68, 2, 40);
  const panels = [0, 1, 2];
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a0c06" }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 奥の料理（明るめ・鮮やかめ＝元気な店の中） */}
      <AbsoluteFill style={{ backgroundColor: "#1a0c06" }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.8) saturate(1.4)", transform: "scale(" + bgScale + ")" }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")", filter: "saturate(1.12) contrast(1.04)" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(26,12,6,0.5) 0%, rgba(26,12,6,0.06) 20%, rgba(0,0,0,0) 44%, rgba(26,12,6,0.36) 64%, rgba(26,12,6,0.92) 100%)" }} />
      </AbsoluteFill>

      {/* 朱赤の暖簾（3枚）が持ち上がって開く */}
      {panels.map((i) => {
        const ty = interpolate(f, [34 + i * 5, 78 + i * 5], [0, -112], { ...clamp, easing: Easing.inOut(Easing.cubic) });
        return (
          <div key={i} style={{ position: "absolute", top: 0, left: "calc(" + (i * 33.34) + "% + " + (i * 4) + "px)", width: "calc(33.34% - 6px)", height: "100%", background: "linear-gradient(180deg," + AKA + "," + AKA_DARK + ")", borderRight: i < 2 ? "2px solid rgba(0,0,0,0.3)" : "none", boxShadow: "inset 0 -30px 60px rgba(0,0,0,0.3)", transform: "translateY(" + ty + "%)" }} />
        );
      })}
      {/* 暖簾の文字（ロゴ＋黄札の営業中） */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: norenTextO }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 560, height: "auto", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5))" }} />
        <div style={{ marginTop: 30, background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "10px 30px",
          transform: "rotate(-2deg)", boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
          <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 42, letterSpacing: 6 }}>営業中</span>
        </div>
      </AbsoluteFill>

      {/* いらっしゃい！ → 品名（朱帯） → 屋号 */}
      <div style={{ position: "absolute", bottom: 356, left: 0, width: "100%", textAlign: "center", opacity: welcomeO, transform: "scale(" + welcomeS + ")" }}>
        <span style={{ color: SHIRO, fontFamily: fude, fontSize: 76, letterSpacing: 4, ...fuchi(KURO, 6) }}>いらっしゃい！</span>
      </div>

      <div style={{ position: "absolute", bottom: 216, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8, padding: "14px 42px",
          transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: nm, letterSpacing: 2, whiteSpace: "nowrap" }}>{hero.caption}</span>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 110, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <span style={{ color: SHIRO, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>{storeName}　{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
