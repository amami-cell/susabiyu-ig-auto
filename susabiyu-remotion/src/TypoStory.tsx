import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";

const { fontFamily: mincho } = loadFont();
const PAPER = "#f4efe4";
const INK = "#23201b";
const SUB = "#7a7064";
const ACCENT = "#a8392c";
const CLOSING = "ご来店、お待ちしております";
const TITLE = 72;
const PER = 48;
const OUTRO = 50;
const N = typoPhotos.length;
const TOTAL = TITLE + N * PER + OUTRO;

const Title: React.FC<{ headline: string; storeName: string }> = ({ headline, storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, TITLE - 10, TITLE], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kick = interpolate(f, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ruleW = interpolate(f, [10, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const headY = interpolate(f, [16, 34], [36, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const headO = interpolate(f, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footO = interpolate(f, [34, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const parts = headline.split("、").filter(Boolean);
  const lines = parts.map((p, i) => (i < parts.length - 1 ? p + "、" : p));
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, justifyContent: "center", alignItems: "flex-start", padding: "0 96px", opacity: o }}>
      <div style={{ color: ACCENT, fontFamily: mincho, fontSize: 30, letterSpacing: 14, opacity: kick, marginBottom: 26 }}>本日のおすすめ</div>
      <div style={{ width: (ruleW * 100) + "%", height: 2, backgroundColor: INK, marginBottom: 40 }} />
      <div style={{ opacity: headO, transform: "translateY(" + headY + "px)" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 78, letterSpacing: 4, lineHeight: 1.45 }}>{l}</div>
        ))}
      </div>
      <div style={{ height: 70 }} />
      <div style={{ color: INK, fontFamily: mincho, fontSize: 34, letterSpacing: 6, opacity: footO, marginBottom: 18 }}>{storeName}</div>
      <div style={{ width: "44%", height: 1, backgroundColor: SUB, marginBottom: 16, opacity: footO }} />
      <div style={{ color: SUB, fontFamily: mincho, fontSize: 26, letterSpacing: 4, opacity: footO }}>京都・河原町三条</div>
    </AbsoluteFill>
  );
};

const TypoSlide: React.FC<{ src: string; caption: string }> = ({ src, caption }) => {
  const f = useCurrentFrame();
  const imgO = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const imgY = interpolate(f, [0, 16], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const capO = interpolate(f, [12, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const capW = interpolate(f, [16, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <div style={{ position: "absolute", top: 96, left: 96, right: 96 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <span style={{ color: SUB, fontFamily: mincho, fontSize: 24, letterSpacing: 8 }}>本日のおすすめ</span>
          <span style={{ color: SUB, fontFamily: mincho, fontSize: 22, letterSpacing: 4 }}>すさび湯</span>
        </div>
        <div style={{ height: 1, backgroundColor: SUB }} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: imgO, transform: "translateY(" + imgY + "px)" }}>
        <Img src={staticFile(src)} style={{ maxWidth: "78%", maxHeight: "56%", objectFit: "contain", border: "2px solid " + INK, boxShadow: "0 22px 50px rgba(0,0,0,0.22)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 250, left: 0, width: "100%", textAlign: "center", opacity: capO }}>
        <div style={{ width: (capW * 80) + "px", height: 2, backgroundColor: ACCENT, margin: "0 auto 22px" }} />
        <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 50, letterSpacing: 6 }}>{caption}</span>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ handle: string; storeName: string }> = ({ handle, storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, OUTRO - 12, OUTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(f, [10, 26], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const co = interpolate(f, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fo = interpolate(f, [22, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 52, letterSpacing: 6, opacity: co, transform: "translateY(" + cy + "px)", textAlign: "center", padding: "0 60px", lineHeight: 1.5 }}>{CLOSING}</div>
      <div style={{ width: 180, height: 2, backgroundColor: ACCENT, margin: "34px 0", opacity: fo }} />
      <div style={{ color: INK, fontFamily: mincho, fontSize: 36, letterSpacing: 6, marginBottom: 14, opacity: fo }}>{storeName}</div>
      <div style={{ color: SUB, fontFamily: mincho, fontSize: 28, letterSpacing: 4, opacity: fo }}>京都・河原町三条　{handle}</div>
    </AbsoluteFill>
  );
};

export const TypoStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(f) => interpolate(f, [0, 15, TOTAL - 22, TOTAL], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence durationInFrames={TITLE}>
        <Title headline={typoHeadline} storeName={storeName} />
      </Sequence>
      {typoPhotos.map((p, i) => (
        <Sequence key={i} from={TITLE + i * PER} durationInFrames={PER}>
          <TypoSlide src={p.src} caption={p.caption} />
        </Sequence>
      ))}
      <Sequence from={TITLE + N * PER} durationInFrames={OUTRO}>
        <Outro handle={handle} storeName={storeName} />
      </Sequence>
    </AbsoluteFill>
  );
};
