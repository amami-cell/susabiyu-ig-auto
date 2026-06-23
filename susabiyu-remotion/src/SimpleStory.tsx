import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { simplePhoto, simplePhrase, simpleHasLogo } from "./simpleData";

const { fontFamily: brush } = loadFont();

const BG = "#140b07";
const GOLD = "#d4a574";
const M = 96;

export const SimpleStory: React.FC<{ storeName?: string; handle?: string }> = ({
  storeName = "",
  handle = "@susabiyu_sanjyo",
}) => {
  const src = staticFile(simplePhoto);
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
          top: 230,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {simpleHasLogo ? (
          <Img src={staticFile("logo.png")} style={{ height: 140, width: "auto", maxWidth: 440, objectFit: "contain" }} />
        ) : null}
        <div style={{ color: GOLD, fontFamily: brush, fontSize: 40, letterSpacing: 10, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
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
          <Img src={src} style={{ display: "block", maxWidth: 1080 - M * 2, maxHeight: 1040, width: "auto", height: "auto" }} />
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
