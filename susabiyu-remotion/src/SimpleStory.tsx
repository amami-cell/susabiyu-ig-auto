import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { simplePhoto, simplePhrase, simpleHasLogo, simpleW, simpleH } from "./simpleData";

const { fontFamily: brush } = loadFont();

const BG = "#140b07";
const GOLD = "#d4a574";
const M = 96;

export const SimpleStory: React.FC<{ storeName?: string; handle?: string }> = ({
  storeName = "",
  handle = "@susabiyu_sanjyo",
}) => {
  const src = staticFile(simplePhoto);
  const FRAME_W = 1000;
  const SAFE_H = 1052;
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
            filter: "blur(34px) brightness(0.3)",
            transform: "scale(1.3)",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(20,11,7,0.5) 0%, rgba(20,11,7,0.1) 22%, rgba(20,11,7,0.15) 52%, rgba(20,11,7,0.94) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 250,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {simpleHasLogo ? (
          <Img src={staticFile("logo.png")} style={{ width: 70, height: "auto", objectFit: "contain" }} />
        ) : null}
        <div style={{ color: GOLD, fontFamily: brush, fontSize: 32, letterSpacing: 8, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
          {storeName}
        </div>
      </div>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(212,165,116,0.4)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
            lineHeight: 0,
          }}
        >
          <Img src={src} style={{ display: "block", width: dispW, height: dispH, maxWidth: FRAME_W, maxHeight: SAFE_H }} />
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          bottom: 290,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 70px",
        }}
      >
        <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, marginBottom: 26 }} />
        <div
          style={{
            color: "#fff",
            fontFamily: brush,
            fontSize: 58,
            letterSpacing: 4,
            textAlign: "center",
            lineHeight: 1.5,
            textShadow: "0 2px 22px rgba(0,0,0,0.9), 0 0 40px rgba(212,165,116,0.25)",
          }}
        >
          {simplePhrase}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          textAlign: "center",
          color: "rgba(255,255,255,0.8)",
          fontFamily: brush,
          fontSize: 26,
          letterSpacing: 4,
          textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
