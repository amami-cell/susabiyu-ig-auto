import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#000";
const CREAM = "#ece4d4";
const AMBER = "#c7a468";
const BAR = 170;          // レターボックス（上下の黒帯）
const INTRO = 46;
const PER = 80;
const OUTRO = 50;
const N = typoPhotos.length;
const TOTAL = INTRO + N * PER + OUTRO;

const Bars: React.FC = () => (
  <>
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: BAR, backgroundColor: "#000" }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: BAR, backgroundColor: "#000" }} />
  </>
);

const Intro: React.FC<{ storeName: string }> = ({ storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 14, INTRO - 10, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lw = interpolate(f, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ color: AMBER, fontFamily: mincho, fontSize: 28, letterSpacing: 18, marginBottom: 28 }}>大人の隠れ家</div>
      <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 600, fontSize: 60, letterSpacing: 10 }}>{storeName}</div>
      <div style={{ width: (lw * 220) + "px", height: 1, backgroundColor: AMBER, marginTop: 30 }} />
      <div style={{ color: "#9a8f7c", fontFamily: mincho, fontSize: 24, letterSpacing: 8, marginTop: 22 }}>京都・河原町三条</div>
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ src: string; caption: string; idx: number }> = ({ src, caption, idx }) => {
  const f = useCurrentFrame();
  const dir = idx % 2 === 0 ? 1 : -1;
  const scale = interpolate(f, [0, PER], [1.14, 1.22], { extrapolateRight: "clamp" });
  const panX = interpolate(f, [0, PER], [0, dir * -36], { extrapolateRight: "clamp" });
  const imgO = interpolate(f, [0, 16, PER - 14, PER], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const capO = interpolate(f, [20, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flick = 0.06 + 0.05 * Math.abs(Math.sin(f * 1.3));
  const fs = oneLineFont(caption, 760, 40, 4, 26);
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill style={{ opacity: imgO }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + scale + ") translateX(" + panX + "px)" }} />
        {/* 暖色グレーディング＋暗め */}
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(40,24,8,0.30), rgba(8,6,10,0.30))" }} />
        {/* ビネット */}
        <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)" }} />
      </AbsoluteFill>
      <Bars />
      {/* フィルムのちらつき（粒状感の代用） */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: flick }} />
      <div style={{ position: "absolute", left: 80, bottom: BAR - 64, opacity: capO, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 26, height: 2, backgroundColor: AMBER }} />
        <span style={{ color: CREAM, fontFamily: mincho, fontSize: fs, letterSpacing: 4, whiteSpace: "nowrap" }}>{caption}</span>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ handle: string; storeName: string }> = ({ handle, storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, OUTRO - 12, OUTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const co = interpolate(f, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 500, fontSize: 46, letterSpacing: 8, opacity: co, textAlign: "center", padding: "0 70px", lineHeight: 1.6 }}>静かに飲める夜を、ここで。</div>
      <div style={{ width: 180, height: 1, backgroundColor: AMBER, margin: "30px 0", opacity: co }} />
      <div style={{ color: CREAM, fontFamily: mincho, fontSize: 34, letterSpacing: 6, opacity: co }}>{storeName}　{handle}</div>
    </AbsoluteFill>
  );
};

export const CinemaStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(typoMusic)} volume={(f) => interpolate(f, [0, 18, TOTAL - 24, TOTAL], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence durationInFrames={INTRO}>
        <Intro storeName={storeName} />
      </Sequence>
      {typoPhotos.map((p, i) => (
        <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
          <Shot src={p.src} caption={p.caption} idx={i} />
        </Sequence>
      ))}
      <Sequence from={INTRO + N * PER} durationInFrames={OUTRO}>
        <Outro handle={handle} storeName={storeName} />
      </Sequence>
    </AbsoluteFill>
  );
};
