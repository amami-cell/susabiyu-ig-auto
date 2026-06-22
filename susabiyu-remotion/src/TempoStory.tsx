import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { tempoPhotos, tempoMusic } from "./tempoData";

const { fontFamily: brush } = loadFont();
const GOLD = "#d4a574";
const BG = "#140b07";
const CLOSING = "ご来店、お待ちしております";
const INTRO = 48;
const PER = 22;
const OUTRO = 56;
const N = tempoPhotos.length;
const TOTAL = INTRO + N * PER + OUTRO;

const Slide: React.FC<{ src: string; caption: string }> = ({ src, caption }) => {
  const f = useCurrentFrame();
  const scale = interpolate(f, [0, 10], [1.06, 1.0], { extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const capY = interpolate(f, [2, 10], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const capO = interpolate(f, [2, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.45)", transform: "scale(1.2)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={staticFile(src)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: "scale(" + scale + ")", boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.82) 100%)" }} />
      <div style={{ position: "absolute", bottom: 175, width: "100%", textAlign: "center", opacity: capO, transform: "translateY(" + capY + "px)" }}>
        <div style={{ display: "inline-block", backgroundColor: "rgba(20,11,7,0.78)", border: "2px solid " + GOLD, borderRadius: 14, padding: "12px 32px" }}>
          <span style={{ color: "#fff", fontFamily: brush, fontSize: 50, letterSpacing: 4 }}>{caption}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Intro: React.FC<{ storeName: string }> = ({ storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, INTRO - 8, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoS = interpolate(f, [0, 16], [0.8, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const lineW = interpolate(f, [10, 26], [0, 260], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const subY = interpolate(f, [14, 28], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const subO = interpolate(f, [14, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: o }}>
      <Img src={staticFile("logo.png")} style={{ height: 210, width: "auto", objectFit: "contain", marginBottom: 24, transform: "scale(" + logoS + ")" }} />
      <div style={{ color: "#fff", fontFamily: brush, fontSize: 50, letterSpacing: 8 }}>{storeName}</div>
      <div style={{ width: lineW, height: 2, backgroundColor: GOLD, margin: "22px 0" }} />
      <div style={{ color: GOLD, fontFamily: brush, fontSize: 32, letterSpacing: 10, opacity: subO, transform: "translateY(" + subY + "px)" }}>京都・河原町三条の寿司酒場</div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ handle: string }> = ({ handle }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, OUTRO - 12, OUTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoS = interpolate(f, [0, 18], [0.9, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const closeY = interpolate(f, [12, 28], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const closeO = interpolate(f, [12, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footO = interpolate(f, [24, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: o }}>
      <Img src={staticFile("logo.png")} style={{ height: 160, width: "auto", objectFit: "contain", marginBottom: 30, transform: "scale(" + logoS + ")" }} />
      <div style={{ color: "#fff", fontFamily: brush, fontSize: 56, letterSpacing: 6, opacity: closeO, transform: "translateY(" + closeY + "px)", textAlign: "center", padding: "0 60px", lineHeight: 1.4 }}>{CLOSING}</div>
      <div style={{ width: 220, height: 2, backgroundColor: GOLD, margin: "30px 0", opacity: footO }} />
      <div style={{ color: GOLD, fontFamily: brush, fontSize: 38, letterSpacing: 8, marginBottom: 12, opacity: footO }}>京都・河原町三条</div>
      <div style={{ color: "rgba(255,255,255,0.9)", fontFamily: brush, fontSize: 34, letterSpacing: 4, opacity: footO }}>{handle}</div>
    </AbsoluteFill>
  );
};

export const TempoStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(tempoMusic)} volume={(f) => interpolate(f, [0, 15, TOTAL - 22, TOTAL], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence durationInFrames={INTRO}>
        <Intro storeName={storeName} />
      </Sequence>
      {tempoPhotos.map((p, i) => (
        <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
          <Slide src={p.src} caption={p.caption} />
        </Sequence>
      ))}
      <Sequence from={INTRO + N * PER} durationInFrames={OUTRO}>
        <Outro handle={handle} />
      </Sequence>
    </AbsoluteFill>
  );
};
