// CapCut参考⑥「FOOD Story」風：暗いシネマ調の料理モンタージュ。
// 3段の帯→タイトル→全画面スチル（ゆっくりズーム）→斜めの白黒⇔カラー分割ワイプ。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadScript } from "@remotion/google-fonts/DancingScript";
import { pick, capNormal } from "./capData";
import { Cine, punch } from "./cine";

const { fontFamily: sans } = loadSans();
const { fontFamily: script } = loadScript();
const INTRO = 75;
const PER = 52;
const STILLS = pick(4, 5);
const SPLIT = 70;
const OUTRO = 55;
export const CAP6_DUR = INTRO + STILLS.length * PER + SPLIT + OUTRO;
const BANDS = pick(3, 2);
const QUAD = pick(4, 6);

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const shown = Math.floor(interpolate(f, [8, 34], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const scriptO = interpolate(f, [30, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fade = interpolate(f, [INTRO - 10, INTRO], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0c", opacity: fade }}>
      {/* 3段の帯写真が左右から入る */}
      {BANDS.map((p, i) => {
        const from = i % 2 === 0 ? -1080 : 1080;
        const x = interpolate(f, [i * 5, i * 5 + 18], [from, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        return (
          <div key={i} style={{ position: "absolute", top: 210 + i * 520, width: 1080, height: 470, overflow: "hidden", transform: "translateX(" + x + "px)", filter: "brightness(0.55)" }}>
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
      {/* タイトル：FOOD 1字ずつ＋Story 筆記体（重なり） */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 150, letterSpacing: interpolate(f, [8, 40], [34, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 14px 60px rgba(0,0,0,0.8)" }}>{"FOOD".slice(0, shown)}</div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: -46, color: "#fff", fontFamily: script, fontSize: 96, opacity: scriptO, textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}>Story</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Still: React.FC<{ src: string; caption: string }> = ({ src, caption }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, PER - 8, PER], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const z = interpolate(f, [0, PER], [1.0, 1.09]) * punch(f, 0.04);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0c", opacity: o }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")", filter: "brightness(0.9) contrast(1.06)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.6) 100%)" }} />
      <div style={{ position: "absolute", bottom: 120, width: "100%", textAlign: "center", color: "rgba(255,255,255,0.92)", fontFamily: sans, fontWeight: 600, fontSize: 40, letterSpacing: 6 }}>{caption}</div>
    </AbsoluteFill>
  );
};

// 2x2の分割画面：斜めのラインで白黒→カラーが入れ替わるワイプ
const QuadSplit: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [6, SPLIT - 12], [-25, 125], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const o = interpolate(f, [0, 8, SPLIT - 8, SPLIT], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const grid = (gray: boolean) => (
    <div style={{ display: "grid", width: "100%", height: "100%", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8, filter: gray ? "grayscale(1) brightness(0.8)" : "none" }}>
      {QUAD.map((p2, i) => (
        <div key={i} style={{ overflow: "hidden" }}>
          <Img src={staticFile(p2.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0c", opacity: o }}>
      <AbsoluteFill>{grid(true)}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: "polygon(0% 0%, " + (p + 18) + "% 0%, " + (p - 18) + "% 100%, 0% 100%)" }}>{grid(false)}</AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: p + "%", width: 4, background: "rgba(255,255,255,0.9)", boxShadow: "0 0 26px rgba(255,255,255,0.8)", transform: "skewX(-10deg)" }} />
    </AbsoluteFill>
  );
};

export const CapStory: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const outStart = INTRO + STILLS.length * PER + SPLIT;
  const outO = interpolate(f, [outStart, outStart + 14, CAP6_DUR - 8, CAP6_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0c" }}>
      <Audio src={staticFile(capNormal)} volume={(v) => interpolate(v, [0, 15, CAP6_DUR - 22, CAP6_DUR], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      {STILLS.map((p, i) => (
        <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
          <Cine dark><Still src={p.src} caption={p.caption} /></Cine>
        </Sequence>
      ))}
      <Sequence from={INTRO + STILLS.length * PER} durationInFrames={SPLIT}>
        <Cine dark><QuadSplit /></Cine>
      </Sequence>
      <Sequence from={outStart} durationInFrames={OUTRO}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: outO }}>
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{ color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 120, letterSpacing: 14 }}>FOOD</div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: -40, color: "#fff", fontFamily: script, fontSize: 80 }}>Story</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: sans, fontSize: 32, letterSpacing: 4, marginTop: 110 }}>{handle}</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
