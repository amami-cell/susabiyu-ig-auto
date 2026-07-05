// 大衆・額装（画像投稿）：好評の「大衆・全画面」「大衆・王道」と同じデザイン言語で統一。
// 提灯の灯る暖色の店内に、白木フチの写真を傾けて飾る。写真は切り抜かず全体を見せる。
// 品名フレーズは朱帯＋太筆、黄札「本日のオススメ」。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { simplePhoto, simplePhrase, simpleHasLogo, simpleW, simpleH } from "./simpleData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Lanterns, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();

export const TaishuGaku: React.FC<{ storeName?: string; handle?: string }> = ({
  handle = "@susabiyu_sanjyo",
}) => {
  const src = staticFile(simplePhoto);
  const FRAME_W = 940;
  const SAFE_H = 980;
  let dispScale = (simpleW > 0 && simpleH > 0) ? Math.min(FRAME_W / simpleW, SAFE_H / simpleH) : 0;
  if (dispScale > 1.25) dispScale = 1.25;
  const dispW = dispScale > 0 ? Math.round(simpleW * dispScale) : FRAME_W;
  const dispH = dispScale > 0 ? Math.round(simpleH * dispScale) : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a120a" }}>
      {/* 同じ写真のぼかしで店の壁をつくる（全画面と同じ手法） */}
      <AbsoluteFill>
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(45px) brightness(0.6) saturate(1.5)", transform: "scale(1.3)" }}
        />
        <AbsoluteFill style={{ background: "rgba(163,18,38,0.25)" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(42,18,10,0.62) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 55%, rgba(42,18,10,0.9) 100%)",
        }}
      />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.28) 0%, rgba(0,0,0,0) 50%)" }} />
      <Lanterns />
      {simpleHasLogo ? (
        <Img src={staticFile("logo.png")} style={{ position: "absolute", top: 240, right: 60, height: 110, width: "auto", objectFit: "contain", opacity: 0.9,
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }} />
      ) : null}

      {/* 写真：白木フチで傾けて飾る（切り抜きなし・全体表示） */}
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
          {/* 黄札（全画面と同じ札） */}
          <div style={{ position: "absolute", top: -38, left: -30, transform: "rotate(-8deg)",
            background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "8px 24px",
            boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
            <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 38, whiteSpace: "nowrap" }}>本日のオススメ</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* フレーズ：朱帯＋太筆（全画面と同じ帯） */}
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8,
          padding: "16px 44px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: oneLineFont(simplePhrase, 860, 56, 2, 28), letterSpacing: 2, whiteSpace: "nowrap" }}>
            {simplePhrase}
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 158,
          width: "100%",
          textAlign: "center",
          color: SHIRO,
          fontFamily: goshi,
          fontSize: 28,
          letterSpacing: 2,
          ...fuchi(KURO, 4),
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
