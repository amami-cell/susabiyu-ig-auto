// 三条・画像投稿のデザイン案4方向（方向性決め用の見本）。
// 全案共通: 写真は切り抜かず全体表示。札の言葉は写真の種類で出し分ける
// （料理→名物/一番人気など、店内・外観・ドリンク→営業中/今夜もにぎやか）。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { loadFont as loadPop } from "@remotion/google-fonts/MochiyPopOne";
import { loadFont as loadChalk } from "@remotion/google-fonts/Yomogi";
import { photoStoryPhoto, photoStoryCaption, photoStoryHasLogo, photoStoryGenre } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Lanterns, fuchi, SunburstBg, Halftone, Tex, Spot, BlackboardBg } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const { fontFamily: pop } = loadPop();
const { fontFamily: chalk } = loadChalk();

const FOOD_TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];
const ATMO_TAG = ["営業中", "今夜もにぎやか", "本日も元気", "お待ちしてます"];
function pickTag(): string {
  const pool = photoStoryGenre === "atmo" ? ATMO_TAG : FOOD_TAG;
  return pool[photoStoryCaption.length % pool.length];
}

// 黄札（共通部品）
const Fuda: React.FC<{ text: string; font?: string }> = ({ text, font = goshi }) => (
  <div style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "8px 24px",
    boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
    <span style={{ color: AKA_DARK, fontFamily: font, fontWeight: 800, fontSize: 38, whiteSpace: "nowrap" }}>{text}</span>
  </div>
);

// 写真（白フチ・全体表示・軽い傾き）
const Shashin: React.FC<{ frame?: string; deg?: number; maxH?: number }> = ({ frame = "#f2e3c2", deg = -2, maxH = 950 }) => (
  <div style={{ overflow: "hidden", border: "8px solid " + frame, borderRadius: 6, transform: "rotate(" + deg + "deg)",
    boxShadow: "0 26px 70px rgba(0,0,0,0.55)", lineHeight: 0 }}>
    <Img src={staticFile(photoStoryPhoto)} style={{ display: "block", maxWidth: 930, maxHeight: maxH, width: "auto", height: "auto",
      filter: "saturate(1.12) contrast(1.04)" }} />
  </div>
);

// ── 案A: 提灯（好評の全画面デザインの静止画） ──
export const TaishuImgA: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const src = staticFile(photoStoryPhoto);
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a120a" }}>
      <AbsoluteFill>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(45px) brightness(0.6) saturate(1.5)", transform: "scale(1.3)" }} />
        <AbsoluteFill style={{ background: "rgba(163,18,38,0.25)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(42,18,10,0.62) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 55%, rgba(42,18,10,0.9) 100%)" }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.28) 0%, rgba(0,0,0,0) 50%)" }} />
      <Lanterns />
      {photoStoryHasLogo ? (
        <Img src={staticFile("logo.png")} style={{ position: "absolute", top: 240, right: 60, height: 110, width: "auto", objectFit: "contain", opacity: 0.9 }} />
      ) : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Shashin />
          <div style={{ position: "absolute", top: -38, left: -28, transform: "rotate(-8deg)" }}><Fuda text={pickTag()} /></div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8,
          padding: "16px 44px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: oneLineFont(photoStoryCaption, 860, 56, 2, 28), letterSpacing: 2, whiteSpace: "nowrap" }}>{photoStoryCaption}</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 158, width: "100%", textAlign: "center", color: SHIRO, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>{handle}</div>
    </AbsoluteFill>
  );
};

// ── 案B: レトロ印刷チラシ（値札チラシの世界・明るい紙面） ──
export const TaishuImgB: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const SHU = "#c73a28", SHU_DARK = "#96261a", KAMI = "#f0dcae", KIN = "#e8b64c";
  return (
    <AbsoluteFill style={{ backgroundColor: KAMI }}>
      <SunburstBg speed={0} c1={SHU} c2={KAMI} />
      <Halftone opacity={0.16} color="rgba(120,45,15,0.7)" />
      <Tex opacity={0.16} blend="multiply" />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(90,35,10,0.28) 100%)" }} />
      <div style={{ position: "absolute", top: 128, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "linear-gradient(180deg," + SHU + "," + SHU_DARK + ")",
          border: "3px solid " + KIN, borderRadius: 10, padding: "12px 44px", transform: "rotate(-1deg)",
          boxShadow: "0 4px 0 " + SHU_DARK + ", 0 12px 30px rgba(70,25,5,0.4)" }}>
          <span style={{ color: "#fff7e6", fontFamily: pop, fontSize: 44, letterSpacing: 2, whiteSpace: "nowrap" }}>{pickTag()}</span>
        </div>
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Shashin frame="#fdf6e6" maxH={900} />
          {photoStoryHasLogo ? (
            <Img src={staticFile("logo.png")} style={{ position: "absolute", bottom: -18, right: -24, width: 110, height: "auto", objectFit: "contain",
              filter: "drop-shadow(0 6px 14px rgba(90,35,5,0.4))" }} />
          ) : null}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 245, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: "#fdf6e6", border: "4px dashed " + SHU, borderRadius: 12,
          padding: "18px 46px", transform: "rotate(-1deg)", boxShadow: "0 10px 26px rgba(90,35,5,0.3)" }}>
          <span style={{ color: SHU_DARK, fontFamily: pop, fontSize: oneLineFont(photoStoryCaption, 860, 50, 2, 26), whiteSpace: "nowrap" }}>{photoStoryCaption}</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 156, width: "100%", textAlign: "center", color: KURO, fontFamily: pop, fontSize: 30 }}>{handle}</div>
    </AbsoluteFill>
  );
};

// ── 案C: 黒板（イチオシ黒板の世界・チョーク文字） ──
export const TaishuImgC: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const CHALK = "#f2efe4";
  return (
    <AbsoluteFill style={{ backgroundColor: "#274138" }}>
      <BlackboardBg />
      <div style={{ position: "absolute", left: 140, top: 400, width: 560, height: 300, background: "rgba(240,238,225,0.05)", filter: "blur(42px)", transform: "rotate(-8deg)" }} />
      <Tex opacity={0.14} blend="overlay" />
      <Spot x="50%" y="-6%" color="255,214,150" opacity={0.2} />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", pointerEvents: "none" }}>
        <rect x="76" y="96" width="928" height="1728" rx="14" fill="none" stroke={CHALK} strokeWidth="4.5" opacity="0.75" />
        <rect x="96" y="116" width="888" height="1688" rx="10" fill="none" stroke={CHALK} strokeWidth="2" opacity="0.45" strokeDasharray="14 10" />
      </svg>
      <div style={{ position: "absolute", top: 170, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: CHALK, fontFamily: chalk, fontSize: 64 }}>{pickTag()}</span>
        <svg width="1080" height="40" viewBox="0 0 1080 40" style={{ display: "block", margin: "0 auto" }}>
          <polyline points={Array.from({ length: 27 }, (_, i) => (340 + i * 15) + "," + (20 + Math.sin(i * 0.72) * 8)).join(" ")}
            fill="none" stroke={CHALK} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Shashin frame="#f5f2e8" deg={-2.5} maxH={900} />
          {photoStoryGenre !== "atmo" ? (
            <div style={{ position: "absolute", top: -46, right: -20, transform: "rotate(-12deg)" }}>
              <div style={{ width: 190, height: 190, borderRadius: "50%", border: "9px solid " + AKA, display: "flex", justifyContent: "center", alignItems: "center",
                background: "rgba(250,244,230,0.94)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                <span style={{ color: AKA, fontFamily: fude, fontSize: 40, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap" }}>店主の<br />イチオシ</span>
              </div>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 255, left: 0, right: 0, textAlign: "center", padding: "0 60px" }}>
        <span style={{ color: CHALK, fontFamily: chalk, fontSize: oneLineFont(photoStoryCaption, 880, 56, 2, 30), whiteSpace: "nowrap" }}>{photoStoryCaption}</span>
      </div>
      <div style={{ position: "absolute", bottom: 165, width: "100%", textAlign: "center", color: "#cfe3d6", fontFamily: chalk, fontSize: 32 }}>{handle}</div>
    </AbsoluteFill>
  );
};

// ── 案D: 紺のれん食堂（グリッドズームの世界・紺×生成り） ──
export const TaishuImgD: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const NAVY = "#17294a", NAVY2 = "#0f1d36", KINARI = "#f2e8d0";
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY2 }}>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, " + NAVY + " 0 214px, " + NAVY2 + " 214px 220px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.35) 100%)" }} />
      {photoStoryHasLogo ? (
        <Img src={staticFile("logo.png")} style={{ position: "absolute", top: 100, right: 64, height: 110, width: "auto", objectFit: "contain", opacity: 0.92 }} />
      ) : null}
      <div style={{ position: "absolute", top: 140, left: 76, transform: "rotate(-6deg)" }}><Fuda text={pickTag()} /></div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Shashin frame={KINARI} deg={-1.5} />
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + KINARI, borderRadius: 8,
          padding: "16px 44px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#fff6e8", fontFamily: fude, fontSize: oneLineFont(photoStoryCaption, 860, 56, 2, 28), letterSpacing: 2, whiteSpace: "nowrap" }}>{photoStoryCaption}</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 158, width: "100%", textAlign: "center", color: KINARI, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>{handle}</div>
    </AbsoluteFill>
  );
};
