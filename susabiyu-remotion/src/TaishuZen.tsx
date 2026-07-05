// 大衆・全画面：烏丸で保管する「全画面」(PhotoStory)の構成そのままに、
// 色味を大衆酒場（提灯色）へ。品名は朱の帯に載せ、掛け声タグを添える。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryHasLogo, photoStoryMusic } from "./photoStoryData";
import { oneLineFont } from "./fit";

const { fontFamily: brush } = loadFont();
const { fontFamily: goshi } = loadGoshi();
const AKA = "#d7263d";
const TAG = ["名物！", "一番人気", "アツアツ！", "自慢の一品", "これ頼んで！", "今日も旨い"];

export const TaishuZen: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bgScale = interpolate(frame, [0, 150], [1.15, 1.22], { extrapolateRight: "clamp" });
  const src = staticFile(photoStoryPhoto);
  const tag = TAG[photoStoryCaption.length % TAG.length];
  const tagOp = interpolate(frame, [10, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#120804" }}>
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
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(45px) brightness(0.55) saturate(1.45)", transform: "scale(" + bgScale + ")" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "saturate(1.12) contrast(1.04)" }} />
      </AbsoluteFill>
      {/* 黒のグラデ → 赤茶の暖色グラデ＋提灯の灯り */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(24,10,4,0.5) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(24,10,4,0.92) 100%)",
        }}
      />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.2) 0%, rgba(0,0,0,0) 48%)" }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 88% 106%, rgba(215,38,61,0.18) 0%, rgba(0,0,0,0) 42%)" }} />
      {photoStoryHasLogo ? (
        <Img
          src={staticFile("logo.png")}
          style={{ position: "absolute", top: 70, right: 60, height: 120, width: "auto", objectFit: "contain", opacity: 0.85 }}
        />
      ) : null}
      {/* 掛け声タグ＋朱帯の品名 */}
      <div style={{ position: "absolute", bottom: 225, width: "100%", textAlign: "center", padding: "0 70px" }}>
        <div style={{ marginBottom: 18, opacity: tagOp }}>
          <span style={{ display: "inline-block", background: AKA, borderRadius: 8, padding: "8px 26px", transform: "rotate(-1.5deg)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)", color: "#fff3e2", fontFamily: goshi, fontWeight: 800, fontSize: 34, letterSpacing: 2 }}>{tag}</span>
        </div>
        <div
          style={{
            color: "#fff",
            fontFamily: brush,
            fontSize: oneLineFont(photoStoryCaption, 940, 66, 6, 30),
            letterSpacing: 5,
            whiteSpace: "nowrap",
            lineHeight: 1.25,
            textShadow: "0 0 28px rgba(255,140,60,0.4), 0 2px 24px rgba(0,0,0,0.95)",
          }}
        >
          {photoStoryCaption}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          textAlign: "center",
          color: "rgba(255,232,200,0.9)",
          fontFamily: goshi,
          fontSize: 28,
          letterSpacing: 3,
          textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
