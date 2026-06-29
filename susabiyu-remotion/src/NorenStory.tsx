import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const NAVY = "#1c3454";
const NAVY2 = "#16293f";
const WHITE = "#f6f1e7";
const GOLD = "#d8b25a";
const DUR = 240;          // 約8秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 暖簾くぐり：暖簾がふわっと持ち上がり、奥の料理がお目見え（来店体験）。
export const NorenStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const zoom = interpolate(f, [0, DUR], [1.0, 1.13], clamp);
  const norenTextO = interpolate(f, [0, 10, 36, 50], [0, 1, 1, 0], clamp);
  const welcomeO = interpolate(f, [86, 102], [0, 1], clamp);
  const welcomeY = interpolate(f, [86, 104], [30, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [104, 120], [0, 1], clamp);
  const nameY = interpolate(f, [104, 122], [36, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 820, 74, 4, 42);
  const panels = [0, 1, 2];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a08" }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 奥の料理（画面いっぱい・通常→アップ。料理が中央に来るよう配置） */}
      <AbsoluteFill style={{ backgroundColor: "#0c0a08" }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 42%", transform: "scale(" + zoom + ")" }} />
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.86) 100%)" }} />
      </AbsoluteFill>

      {/* 暖簾（3枚）が持ち上がって開く */}
      {panels.map((i) => {
        const ty = interpolate(f, [34 + i * 5, 78 + i * 5], [0, -112], { ...clamp, easing: Easing.inOut(Easing.cubic) });
        return (
          <div key={i} style={{ position: "absolute", top: 0, left: "calc(" + (i * 33.34) + "% + " + (i * 4) + "px)", width: "calc(33.34% - 6px)", height: "100%", background: "linear-gradient(180deg," + NAVY + "," + NAVY2 + ")", borderRight: i < 2 ? "2px solid rgba(0,0,0,0.3)" : "none", boxShadow: "inset 0 -30px 60px rgba(0,0,0,0.25)", transform: "translateY(" + ty + "%)" }} />
        );
      })}
      {/* 暖簾の文字（ロゴ＋営業中） */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: norenTextO }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 560, height: "auto", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5))" }} />
        <div style={{ marginTop: 30, color: GOLD, fontFamily: mincho, fontWeight: 700, fontSize: 40, letterSpacing: 18, border: "3px solid " + GOLD, padding: "8px 26px", borderRadius: 6 }}>営業中</div>
      </AbsoluteFill>

      {/* いらっしゃいませ */}
      <div style={{ position: "absolute", top: 150, left: 0, width: "100%", textAlign: "center", opacity: welcomeO, transform: "translateY(" + welcomeY + "px)" }}>
        <span style={{ display: "inline-block", background: "rgba(28,52,84,0.86)", color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 38, letterSpacing: 6, padding: "14px 36px", borderRadius: 8 }}>ご来店お待ちしております。</span>
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

export const NOREN_DUR = DUR;
