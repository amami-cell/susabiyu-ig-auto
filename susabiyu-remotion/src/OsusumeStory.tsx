import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#0c0a08";
const RED = "#c0312a";
const GOLD = "#e7c46a";
const WHITE = "#f8f3e9";
const DUR = 240;         // 約8秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 本日のおすすめ／店主おすすめ：はじめは料理全体（切れない）→ 徐々にズームイン。店主おすすめスタンプ。
export const OsusumeStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const imgO = interpolate(f, [0, 14], [0, 1], clamp);
  // 通常（全体表示）から徐々にアップ
  const zoom = interpolate(f, [0, DUR], [1.0, 1.18], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.14, 1.3], clamp);
  const bandY = interpolate(f, [10, 26], [-120, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const bandO = interpolate(f, [10, 24], [0, 1], clamp);
  const nameO = interpolate(f, [30, 46], [0, 1], clamp);
  const nameY = interpolate(f, [30, 48], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const stampS = interpolate(f, [40, 56, 64], [0, 1.16, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const stampR = interpolate(f, [40, 64], [-22, -11], clamp);
  const headO = interpolate(f, [54, 68], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 820, 78, 4, 44);
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 背景：同じ写真をぼかして敷く（余白を埋める） */}
      <AbsoluteFill style={{ opacity: imgO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + bgScale + ")", filter: "blur(28px) brightness(0.5)" }} />
      </AbsoluteFill>
      {/* 前面：料理全体を切らずに表示（contain）→ 徐々にズーム */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: imgO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.82) 100%)" }} />

      {/* 上の帯 */}
      <div style={{ position: "absolute", top: 130, left: 0, width: "100%", display: "flex", justifyContent: "center", opacity: bandO, transform: "translateY(" + bandY + "px)" }}>
        <div style={{ background: RED, color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 40, letterSpacing: 12, padding: "16px 44px", borderRadius: 6, boxShadow: "0 10px 28px rgba(0,0,0,0.4)" }}>本日の一皿</div>
      </div>

      {/* 店主おすすめ スタンプ */}
      <div style={{ position: "absolute", top: 290, right: 64, width: 286, height: 286, transform: "scale(" + stampS + ") rotate(" + stampR + "deg)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "6px solid " + GOLD, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(120,20,16,0.88)", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
          <span style={{ color: GOLD, fontFamily: mincho, fontWeight: 700, fontSize: 50, letterSpacing: 10, marginBottom: 8, whiteSpace: "nowrap" }}>店主</span>
          <span style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 54, letterSpacing: 2, lineHeight: 1, whiteSpace: "nowrap" }}>おすすめ</span>
        </div>
      </div>

      {/* 料理名＋一言 */}
      <div style={{ position: "absolute", bottom: 250, left: 80, right: 80, opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ width: 110, height: 5, backgroundColor: GOLD, marginBottom: 22 }} />
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: nm, letterSpacing: 4, whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>{hero.caption}</div>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 34, letterSpacing: 4, marginTop: 18, opacity: headO }}>{typoHeadline}</div>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 110, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontSize: 28, letterSpacing: 5 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const OSUSUME_DUR = DUR;
