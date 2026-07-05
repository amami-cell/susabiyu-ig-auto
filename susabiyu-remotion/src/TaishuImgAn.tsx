// 三条・画像投稿のデザイン案（保管・選択用）。A提灯 / Bチラシ / D紺のれん / F白抜き文字。
// ※Cの黒板は指示により削除済み。写真は全案とも切り抜かず全体表示。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { loadFont as loadPop } from "@remotion/google-fonts/MochiyPopOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryHasLogo, photoStoryGenre, photoStorySeed } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Lanterns, fuchi, SunburstBg, Halftone, Tex, pickFuda } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const { fontFamily: pop } = loadPop();
function pickTag(): string {
  return pickFuda(photoStoryGenre, photoStorySeed, photoStoryCaption);
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

// ── 案A: 提灯（全画面動画デザインの静止画） ──
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
      {/* 上部中央にロゴ、その下に大きく「営業中」 */}
      <div style={{ position: "absolute", top: 88, left: 0, right: 0, textAlign: "center" }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 560, height: "auto", maxHeight: 210, objectFit: "contain",
          filter: "drop-shadow(0 5px 16px rgba(90,35,5,0.65))" }} />
      </div>
      <div style={{ position: "absolute", top: 306, left: 0, right: 0, textAlign: "center", transform: "rotate(-1deg)" }}>
        <span style={{ color: SHU_DARK, fontFamily: pop, fontSize: 150, letterSpacing: 10, ...fuchi("#fff7e6", 9) }}>営業中</span>
      </div>
      <div style={{ position: "absolute", top: 530, left: 0, right: 0, bottom: 350, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Shashin frame="#fdf6e6" maxH={860} />
          {photoStoryHasLogo ? (
            <Img src={staticFile("logo.png")} style={{ position: "absolute", bottom: -18, right: -24, width: 110, height: "auto", objectFit: "contain",
              filter: "drop-shadow(0 6px 14px rgba(90,35,5,0.4))" }} />
          ) : null}
        </div>
      </div>
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

// ── 案D: 紺のれん食堂（全面ストライプ版・正式「のれん」とは別の見せ方） ──
export const TaishuImgD: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const NAVY = "#17294a", NAVY2 = "#0f1d36", KINARI = "#f2e8d0";
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY2 }}>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, " + NAVY + " 0 214px, " + NAVY2 + " 214px 220px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.35) 100%)" }} />
      {/* 上部中央に白抜きロゴ（のれんの染め抜き風） */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 640, height: "auto", objectFit: "contain",
          filter: "drop-shadow(0 6px 22px rgba(0,0,0,0.55))" }} />
      </div>
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

// ── 案F: 全面写真×白抜き極太文字のせ ──
export const TaishuImgF: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const Ume: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 66 }) => (
    <svg width={s} height={s} viewBox="0 0 60 60" style={{ position: "absolute", left: x, top: y, opacity: 0.95 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={30 + Math.cos(a) * 14} cy={30 + Math.sin(a) * 14} r="11" fill="none" stroke="#fff" strokeWidth="4" />;
      })}
      <circle cx="30" cy="30" r="4.5" fill="#fff" />
    </svg>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#e8c48d" }}>
      <AbsoluteFill>
        <Img src={staticFile(photoStoryPhoto)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(50px) brightness(0.95) saturate(1.15)", transform: "scale(1.2)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={staticFile(photoStoryPhoto)} style={{ maxWidth: "100%", maxHeight: 1250, width: "auto", height: "auto", filter: "saturate(1.1) contrast(1.03)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 90, left: 64, right: 64, bottom: 90, border: "3px solid rgba(255,255,255,0.9)" }} />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 640, height: "auto", objectFit: "contain",
          filter: "drop-shadow(0 6px 22px rgba(60,30,0,0.55))" }} />
      </div>
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, textAlign: "center", transform: "rotate(-3deg)", padding: "0 40px" }}>
        <span style={{ color: "#fff", fontFamily: pop, fontSize: oneLineFont(photoStoryCaption, 920, 64, 2, 30), whiteSpace: "nowrap",
          textShadow: "0 6px 26px rgba(60,30,0,0.5)" }}>{photoStoryCaption}</span>
      </div>
      <Ume x={110} y={330} />
      <Ume x={880} y={210} s={80} />
      <Ume x={130} y={1480} s={56} />
      <Ume x={890} y={1520} />
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: "#fff", fontFamily: pop, fontSize: 30, textShadow: "0 3px 14px rgba(60,30,0,0.6)" }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
