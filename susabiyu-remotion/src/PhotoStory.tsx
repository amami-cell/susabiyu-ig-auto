import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { photoStoryPhoto, photoStoryCaption, photoStoryHasLogo, photoStoryMusic } from "./photoStoryData";
import { oneLineFont } from "./fit";

const { fontFamily: brush } = loadFont();

export const PhotoStory: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bgScale = interpolate(frame, [0, 150], [1.15, 1.22], { extrapolateRight: "clamp" });
  const src = staticFile(photoStoryPhoto);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio
        src={staticFile(photoStoryMusic)}
        volume={(f) =>
          interpolate(f, [0, 20, durationInFrames - 30, durationInFrames], [0, 0.5, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <AbsoluteFill>
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(45px) brightness(0.5)", transform: "scale(" + bgScale + ")" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.88) 100%)",
        }}
      />
      {photoStoryHasLogo ? (
        <Img
          src={staticFile("logo.png")}
          style={{ position: "absolute", top: 70, right: 60, height: 120, width: "auto", objectFit: "contain", opacity: 0.85 }}
        />
      ) : null}
      <div style={{ position: "absolute", bottom: 235, width: "100%", textAlign: "center", padding: "0 70px" }}>
        <div
          style={{
            color: "#fff",
            fontFamily: brush,
            fontSize: oneLineFont(photoStoryCaption, 940, 64, 6, 30),
            letterSpacing: 6,
            whiteSpace: "nowrap",
            lineHeight: 1.25,
            textShadow: "0 2px 24px rgba(0,0,0,0.95), 0 0 50px rgba(0,0,0,0.6)",
          }}
        >
          {photoStoryCaption}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 155,
          width: "100%",
          textAlign: "center",
          color: "rgba(255,255,255,0.85)",
          fontFamily: brush,
          fontSize: 28,
          letterSpacing: 4,
          textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
