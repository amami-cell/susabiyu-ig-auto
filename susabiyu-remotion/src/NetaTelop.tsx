import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#0c0a08";
const GOLD = "#d8b25a";
const WHITE = "#f6f1e7";
const INTRO = 40;
const PER = 60;
const OUTRO = 44;
const N = typoPhotos.length;
const TOTAL = INTRO + N * PER + OUTRO;

const Intro: React.FC<{ storeName: string }> = ({ storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, INTRO - 8, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tO = interpolate(f, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tY = interpolate(f, [6, 20], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ color: GOLD, fontFamily: mincho, fontSize: 30, letterSpacing: 16, marginBottom: 26, opacity: tO }}>握りたて、入荷</div>
      <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 64, letterSpacing: 8, opacity: tO, transform: "translateY(" + tY + "px)" }}>{storeName}</div>
      <div style={{ width: 160, height: 2, backgroundColor: GOLD, marginTop: 30, opacity: tO }} />
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ src: string; caption: string }> = ({ src, caption }) => {
  const f = useCurrentFrame();
  const scale = interpolate(f, [0, PER], [1.08, 1.17], { extrapolateRight: "clamp" });
  const imgO = interpolate(f, [0, 8, PER - 8, PER], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(f, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const capY = interpolate(f, [10, 24], [44, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const capO = interpolate(f, [10, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labO = interpolate(f, [2, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fs = oneLineFont(caption, 900, 96, 6, 48);
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill style={{ opacity: imgO }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + scale + ")" }} />
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.85) 100%)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 110, left: 80, opacity: labO, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 30, height: 2, backgroundColor: GOLD }} />
        <span style={{ color: GOLD, fontFamily: mincho, fontSize: 28, letterSpacing: 10 }}>本日のネタ</span>
      </div>
      <div style={{ position: "absolute", bottom: 270, left: 80, right: 80, opacity: capO, transform: "translateY(" + capY + "px)" }}>
        <div style={{ width: (lineW * 120) + "px", height: 4, backgroundColor: GOLD, marginBottom: 24 }} />
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: fs, letterSpacing: 6, lineHeight: 1.1, whiteSpace: "nowrap", textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>{caption}</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ handle: string; storeName: string }> = ({ handle, storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, OUTRO - 10, OUTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(f, [8, 24], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const co = interpolate(f, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 600, fontSize: 50, letterSpacing: 6, opacity: co, transform: "translateY(" + cy + "px)", textAlign: "center", padding: "0 60px", lineHeight: 1.5 }}>ご来店、お待ちしております</div>
      <div style={{ width: 170, height: 2, backgroundColor: GOLD, margin: "32px 0", opacity: co }} />
      <div style={{ color: WHITE, fontFamily: mincho, fontSize: 36, letterSpacing: 6, marginBottom: 14, opacity: co }}>{storeName}</div>
      <div style={{ color: GOLD, fontFamily: mincho, fontSize: 28, letterSpacing: 4, opacity: co }}>京都・河原町三条　{handle}</div>
    </AbsoluteFill>
  );
};

export const NetaTelop: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(typoMusic)} volume={(f) => interpolate(f, [0, 15, TOTAL - 22, TOTAL], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence durationInFrames={INTRO}>
        <Intro storeName={storeName} />
      </Sequence>
      {typoPhotos.map((p, i) => (
        <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
          <Shot src={p.src} caption={p.caption} />
        </Sequence>
      ))}
      <Sequence from={INTRO + N * PER} durationInFrames={OUTRO}>
        <Outro handle={handle} storeName={storeName} />
      </Sequence>
    </AbsoluteFill>
  );
};
