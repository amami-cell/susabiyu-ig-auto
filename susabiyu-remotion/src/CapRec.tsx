// CapCut参考⑤「REC」風：ビデオカメラの録画画面ごしに料理が切り替わる。
// ●REC・四隅ブラケット・フォーカス枠・音量メーター・手ブレ・タイムコード付き。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/ShareTechMono";
import { pick, rnd, capUptempo } from "./capData";

const { fontFamily: mono } = loadMono();
const PER = 28;
const PHOTOS = pick(8, 4);
const FINALE = 80;
export const CAP5_DUR = PHOTOS.length * PER + FINALE;
const RED = "#ff2d2d";

// 録画HUD（全編にかぶせる）
const Hud: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blink = Math.floor(f / 15) % 2 === 0;
  const sec = Math.floor(f / fps);
  const tc = "00:00:" + String(sec).padStart(2, "0");
  const corner = (r: object) => (
    <div style={{ position: "absolute", width: 90, height: 90, ...r }} />
  );
  const bs = "6px solid rgba(255,255,255,0.9)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 四隅ブラケット */}
      {corner({ top: 60, left: 46, borderTop: bs, borderLeft: bs })}
      {corner({ top: 60, right: 46, borderTop: bs, borderRight: bs })}
      {corner({ bottom: 150, left: 46, borderBottom: bs, borderLeft: bs })}
      {corner({ bottom: 150, right: 46, borderBottom: bs, borderRight: bs })}
      {/* ●REC＋タイムコード */}
      <div style={{ position: "absolute", top: 84, left: 90, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: RED, opacity: blink ? 1 : 0.25, boxShadow: "0 0 18px " + RED }} />
        <span style={{ color: "#fff", fontFamily: mono, fontSize: 46, letterSpacing: 4, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>REC</span>
      </div>
      <div style={{ position: "absolute", top: 92, right: 90, color: "#fff", fontFamily: mono, fontSize: 38, letterSpacing: 2, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{tc}</div>
      {/* 中央フォーカス枠（呼吸） */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 420 + Math.sin(f * 0.12) * 14, height: 420 + Math.sin(f * 0.12) * 14, border: "3px solid rgba(255,255,255,0.75)", borderRadius: 8 }} />
      </AbsoluteFill>
      {/* 下部：音量メーター（毎フレーム決定的に揺れる） */}
      <div style={{ position: "absolute", bottom: 76, left: 90, right: 90, display: "flex", alignItems: "flex-end", gap: 7, height: 54 }}>
        {Array.from({ length: 32 }, (_, i) => {
          const h = 10 + rnd(Math.floor(f / 2) * 31 + i * 7) * 44;
          const hot = h > 42;
          return <div key={i} style={{ width: 18, height: h, background: hot ? RED : "rgba(255,255,255,0.85)", borderRadius: 3 }} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Beat: React.FC<{ src: string; strip: boolean }> = ({ src, strip }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const z = interpolate(f, [0, PER], [1.06, 1.0]);
  if (strip) {
    // 縦フィルムストリップ：同じ被写体が3段でスライド
    const y = interpolate(f, [0, PER], [0, -640], { easing: Easing.inOut(Easing.ease) });
    return (
      <AbsoluteFill style={{ backgroundColor: "#111", opacity: o }}>
        <div style={{ transform: "translateY(" + y + "px)" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 1080, height: 630, marginBottom: 10, overflow: "hidden" }}>
              <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#111", opacity: o }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")" }} />
    </AbsoluteFill>
  );
};

export const CapRec: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  // 手ブレ（決定的な揺れ）
  const shX = Math.sin(f * 0.9) * 4 + Math.sin(f * 0.37 + 2) * 3;
  const shY = Math.cos(f * 0.7) * 3 + Math.sin(f * 0.23 + 1) * 3;
  const finStart = PHOTOS.length * PER;
  const finZ = interpolate(f, [finStart, finStart + FINALE], [1, 1.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const endO = interpolate(f, [CAP5_DUR - 10, CAP5_DUR], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: endO }}>
      <Audio src={staticFile(capUptempo)} volume={(v) => interpolate(v, [0, 12, CAP5_DUR - 20, CAP5_DUR], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <AbsoluteFill style={{ transform: "translate(" + shX + "px," + shY + "px) scale(1.03)" }}>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={i * PER} durationInFrames={PER}>
            <Beat src={p.src} strip={i === 4} />
          </Sequence>
        ))}
        <Sequence from={finStart} durationInFrames={FINALE}>
          <AbsoluteFill style={{ transform: "scale(" + finZ + ")" }}>
            <Img src={staticFile(PHOTOS[0].src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
      <Hud />
      <div style={{ position: "absolute", bottom: 152, width: "100%", textAlign: "center", color: "rgba(255,255,255,0.8)", fontFamily: mono, fontSize: 30, letterSpacing: 4, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{handle}</div>
    </AbsoluteFill>
  );
};
