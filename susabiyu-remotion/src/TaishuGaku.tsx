// 大衆・額装（画像投稿）：烏丸「額装」(SimpleStory)の1枚見せ構成そのままに、
// 墨×金の額縁 → 提灯の灯る店の壁に、白木フチの写真を傾けて飾る大衆版。
// フレーズは朱帯に太筆、黄札の「本日のオススメ」付き。静止画として投稿される。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { simplePhoto, simplePhrase, simpleHasLogo, simpleW, simpleH } from "./simpleData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Lanterns, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const BG = "#2a120a";

export const TaishuGaku: React.FC<{ storeName?: string; handle?: string }> = ({
  storeName = "",
  handle = "@susabiyu_sanjyo",
}) => {
  const src = staticFile(simplePhoto);
  const FRAME_W = 980;
  const SAFE_H = 1000;
  let dispScale = (simpleW > 0 && simpleH > 0) ? Math.min(FRAME_W / simpleW, SAFE_H / simpleH) : 0;
  if (dispScale > 1.25) dispScale = 1.25;
  const dispW = dispScale > 0 ? Math.round(simpleW * dispScale) : FRAME_W;
  const dispH = dispScale > 0 ? Math.round(simpleH * dispScale) : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill>
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(34px) brightness(0.5) saturate(1.45)",
            transform: "scale(1.3)",
          }}
        />
        <AbsoluteFill style={{ background: "rgba(163,18,38,0.24)" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(42,18,10,0.6) 0%, rgba(42,18,10,0.1) 22%, rgba(42,18,10,0.14) 52%, rgba(42,18,10,0.94) 100%)",
        }}
      />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.26) 0%, rgba(0,0,0,0) 50%)" }} />
      <Lanterns />

      <div
        style={{
          position: "absolute",
          top: 255,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {simpleHasLogo ? (
          <Img src={staticFile("logo.png")} style={{ width: 70, height: "auto", objectFit: "contain" }} />
        ) : null}
        <div style={{ color: SHIRO, fontFamily: fude, fontSize: 40, letterSpacing: 4, ...fuchi(KURO, 5) }}>
          {storeName}
        </div>
      </div>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", transform: "rotate(-2deg)" }}>
          <div
            style={{
              overflow: "hidden",
              border: "8px solid #f2e3c2",
              borderRadius: 6,
              boxShadow: "0 26px 70px rgba(0,0,0,0.6)",
              lineHeight: 0,
            }}
          >
            <Img src={src} style={{ display: "block", width: dispW, height: dispH, maxWidth: FRAME_W, maxHeight: SAFE_H, filter: "saturate(1.12) contrast(1.04)" }} />
          </div>
          {/* 黄札：本日のオススメ */}
          <div style={{ position: "absolute", top: -38, left: -30, transform: "rotate(-8deg)",
            background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "8px 22px",
            boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
            <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 36, whiteSpace: "nowrap" }}>本日のオススメ</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* フレーズは朱帯にドン */}
      <div style={{ position: "absolute", bottom: 262, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8,
          padding: "16px 42px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: oneLineFont(simplePhrase, 860, 52, 2, 26), letterSpacing: 2, whiteSpace: "nowrap" }}>
            {simplePhrase}
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 155,
          width: "100%",
          textAlign: "center",
          color: SHIRO,
          fontFamily: goshi,
          fontSize: 27,
          letterSpacing: 2,
          ...fuchi(KURO, 4),
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
