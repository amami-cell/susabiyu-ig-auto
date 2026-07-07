// CapCut参考①「Delicious || food」風：黒背景・白セリフ体タイトルが1字ずつ・
// 料理写真がブラースメア（流れる残像）で切り替わる暗めのショーケース。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";
import { pick, capUptempo } from "./capData";
import { Cine, punch, Flash } from "./cine";

const { fontFamily: serif } = loadFont();
const INTRO = 55;
const PER = 26;
const SMEAR = 8;            // 切替時の流れる残像の長さ
const OUTRO = 50;
const PHOTOS = pick(7);
export const CAP1_DUR = INTRO + PHOTOS.length * PER + OUTRO;

const Title: React.FC<{ big?: boolean }> = ({ big }) => {
  const f = useCurrentFrame();
  const text = "Delicious";
  const shown = Math.floor(interpolate(f, [4, 26], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const barS = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subO = interpolate(f, [22, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 3, height: 70 * barS, background: "#fff", margin: "0 auto 18px" }} />
      <div style={{ color: "#fff", fontFamily: serif, fontStyle: "italic", fontWeight: 800, fontSize: big ? 96 : 72, letterSpacing: 2, textShadow: "0 2px 6px rgba(0,0,0,0.9), 0 12px 44px rgba(0,0,0,0.6)" }}>
        {text.slice(0, shown)}
        <span style={{ opacity: subO, fontWeight: 400 }}> ‖ </span>
        <span style={{ opacity: subO }}>food</span>
      </div>
      <div style={{ width: 3, height: 70 * barS, background: "#fff", margin: "18px auto 0" }} />
    </div>
  );
};

// 写真1枚ぶんのスライド。偶数=全面写真、奇数=黒背景に浮かぶカード。
const Slide: React.FC<{ src: string; full: boolean }> = ({ src, full }) => {
  const f = useCurrentFrame();
  // 入り: 右から流れ込む残像（強い横ブラー→止まる）
  const inX = interpolate(f, [0, SMEAR], [420, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const inBlur = interpolate(f, [0, SMEAR], [26, 0], { extrapolateRight: "clamp" });
  const zoom = interpolate(f, [0, PER], [1.0, 1.05]) * punch(f, 0.05);
  const skew = interpolate(f, [0, SMEAR], [-9, 0], { extrapolateRight: "clamp" });
  const img = (
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + zoom + ")" }} />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: "translateX(" + inX + "px) skewX(" + skew + "deg)", filter: "blur(" + inBlur + "px)" }}>
        {full ? (
          <AbsoluteFill>{img}</AbsoluteFill>
        ) : (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: 760, height: 980, borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 90px rgba(0,0,0,0.8)", transform: "rotate(-2deg)" }}>{img}</div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      {full && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.55) 100%)" }} />}
      <div style={{ position: "absolute", top: 130, width: "100%", textAlign: "center", color: "#fff", fontFamily: serif, fontStyle: "italic", fontWeight: 800, fontSize: 58, textShadow: "0 2px 6px rgba(0,0,0,0.9), 0 10px 36px rgba(0,0,0,0.6)" }}>
        Delicious <span style={{ fontWeight: 400 }}>‖</span> food
      </div>
      <Flash local={f} peak={0.2} />
    </AbsoluteFill>
  );
};

export const CapDelicious: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const outO = interpolate(f, [CAP1_DUR - OUTRO, CAP1_DUR - OUTRO + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile(capUptempo)} volume={(v) => interpolate(v, [0, 15, CAP1_DUR - 20, CAP1_DUR], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence durationInFrames={INTRO}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Title big />
        </AbsoluteFill>
      </Sequence>
      {PHOTOS.map((p, i) => (
        <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
          <Cine dark><Slide src={p.src} full={i % 2 === 0} /></Cine>
        </Sequence>
      ))}
      <Sequence from={INTRO + PHOTOS.length * PER} durationInFrames={OUTRO}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: outO }}>
          <div style={{ color: "#fff", fontFamily: serif, fontStyle: "italic", fontWeight: 800, fontSize: 84 }}>Delicious ‖ food</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontFamily: serif, fontSize: 34, marginTop: 26, letterSpacing: 2 }}>{handle}</div>
        </AbsoluteFill>
      </Sequence>
      <div style={{ position: "absolute", bottom: 60, width: "100%", textAlign: "center", color: "rgba(255,255,255,0.55)", fontFamily: serif, fontSize: 26, letterSpacing: 3 }}>{handle}</div>
    </AbsoluteFill>
  );
};
