// 大衆・全画面：「全画面」(PhotoStory)の1枚見せ構成はそのまま、表現を大衆酒場に。
// 静かな白文字キャプション → 提灯＋黄札＋朱帯の白フチ太文字。写真は明るく元気に。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryHasLogo, photoStoryMusic } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Lanterns, fuchi } from "./taishu";

const { fontFamily: fude } = loadFont();
const { fontFamily: goshi } = loadGoshi();
const TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];

export const TaishuZen: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bgScale = interpolate(frame, [0, 150], [1.15, 1.22], { extrapolateRight: "clamp" });
  const src = staticFile(photoStoryPhoto);
  const tag = TAG[photoStoryCaption.length % TAG.length];
  // 黄札はハンコみたいにドン、朱帯は下からスッ
  const tagS = interpolate(frame, [8, 14], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagO = interpolate(frame, [8, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const capY = interpolate(frame, [12, 22], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const capO = interpolate(frame, [12, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a120a" }}>
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
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(45px) brightness(0.6) saturate(1.5)", transform: "scale(" + bgScale + ")" }}
        />
        <AbsoluteFill style={{ background: "rgba(163,18,38,0.25)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "saturate(1.15) contrast(1.05) brightness(1.02)" }} />
      </AbsoluteFill>
      {/* 上下は暖色の暗がり、上から提灯の灯り */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(42,18,10,0.62) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 55%, rgba(42,18,10,0.9) 100%)",
        }}
      />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.28) 0%, rgba(0,0,0,0) 50%)" }} />
      <Lanterns />
      {photoStoryHasLogo ? (
        <Img
          src={staticFile("logo.png")}
          style={{ position: "absolute", top: 240, right: 60, height: 110, width: "auto", objectFit: "contain", opacity: 0.9 }}
        />
      ) : null}
      {/* 黄札の掛け声（傾けてドン） */}
      <div style={{ position: "absolute", left: 56, bottom: 430, transform: "rotate(-8deg) scale(" + tagS + ")", opacity: tagO,
        background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "10px 26px",
        boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
        <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 42, whiteSpace: "nowrap" }}>{tag}</span>
      </div>
      {/* 品名は朱帯にドンと大きく */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 250, textAlign: "center", opacity: capO, transform: "translateY(" + capY + "px)" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8,
          padding: "18px 48px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: oneLineFont(photoStoryCaption, 860, 64, 2, 30), letterSpacing: 2, whiteSpace: "nowrap" }}>
            {photoStoryCaption}
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
