// 大衆③「賑やか・手書きノート版」＝クラフト紙×手書きマーカーの世界観。
// クラフト紙の上に、マスキングテープで留めたスナップ写真がポンポン置かれ、
// 手書き文字（Yusei Magic）＋蛍光マーカー下線で品名が入る。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadTegaki } from "@remotion/google-fonts/YuseiMagic";
import { Cine, punch } from "./cine";
import { KraftBg, marker, tpick, taishuMusic } from "./taishu";

const { fontFamily: tegaki } = loadTegaki();
const INTRO = 38;
const PER = 24;
const PHOTOS = tpick(6);
const OUTRO = 44;
export const TNIGI_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const SUMI = "#3a2a1a";                 // クラフト紙に合う濃い茶
const TAPE = ["rgba(255,170,190,0.8)", "rgba(160,215,255,0.8)", "rgba(190,235,160,0.8)", "rgba(255,225,140,0.85)"];
const MEMO = ["これ絶対！", "人気No.1", "みんな頼む", "推しです", "リピ確定", "売切御免"];

// マスキングテープ1本
const Tape: React.FC<{ x: number; y: number; deg: number; color: string }> = ({ x, y, deg, color }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 190, height: 54, background: color,
    transform: "rotate(" + deg + "deg)", boxShadow: "0 3px 8px rgba(60,40,20,0.3)", opacity: 0.92 }} />
);

const Snap: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const deg = i % 2 === 0 ? -3.5 : 3.5;
  // ペタッと上から置かれる動き
  const s = interpolate(f, [0, 7], [1.5, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) * punch(f, 0.03, 7);
  const o = interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  // マーカー下線が左から引かれる
  const mw = interpolate(f, [8, 15], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const memoO = interpolate(f, [12, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tape = TAPE[i % TAPE.length];
  return (
    <AbsoluteFill>
      <KraftBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
        <div style={{ position: "relative", transform: "rotate(" + deg + "deg) scale(" + s + ")" }}>
          <div style={{ width: 840, background: "#fffdf6", padding: "26px 26px 30px", boxShadow: "0 20px 50px rgba(60,35,10,0.45)" }}>
            <Img src={staticFile(src)} style={{ width: "100%", height: 980, objectFit: "cover" }} />
            <div style={{ textAlign: "center", marginTop: 22 }}>
              <span style={{ display: "inline-block", color: SUMI, fontFamily: tegaki, fontSize: 58, whiteSpace: "nowrap",
                ...(mw > 0 ? { backgroundImage: "linear-gradient(transparent 58%, rgba(255,220,60,0.75) 58%, rgba(255,220,60,0.75) 92%, transparent 92%)", backgroundRepeat: "no-repeat", backgroundSize: mw + "% 100%" } : {}) }}>{caption}</span>
            </div>
          </div>
          {/* 角のマスキングテープ2本 */}
          <Tape x={-60} y={-24} deg={-38} color={tape} />
          <Tape x={720} y={-24} deg={34} color={TAPE[(i + 1) % TAPE.length]} />
          {/* 手書きのひとことメモ */}
          <div style={{ position: "absolute", right: -40, bottom: 110, transform: "rotate(6deg)", opacity: memoO }}>
            <span style={{ color: "#c2452e", fontFamily: tegaki, fontSize: 48, whiteSpace: "nowrap" }}>{MEMO[i % MEMO.length]}</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TaishuNigi: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iS = interpolate(f, [3, 11], [1.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iMw = interpolate(f, [10, 20], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const outStart = INTRO + PHOTOS.length * PER;
  const oO = interpolate(f, [outStart, outStart + 6, TNIGI_DUR - 8, TNIGI_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oS = interpolate(f, [outStart + 2, outStart + 10], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#bb8e57" }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TNIGI_DUR - 18, TNIGI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.05) saturate(1.15) brightness(1.03)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <KraftBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: SUMI, fontFamily: tegaki, fontSize: 104, lineHeight: 1.35 }}>
                  今夜の<br />
                  <span style={{ display: "inline-block", backgroundImage: "linear-gradient(transparent 58%, rgba(255,220,60,0.75) 58%, rgba(255,220,60,0.75) 92%, transparent 92%)", backgroundRepeat: "no-repeat", backgroundSize: iMw + "% 100%" }}>おすすめメモ</span>
                </div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Snap src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <KraftBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ position: "relative", transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center",
                background: "#fffdf6", padding: "56px 76px", boxShadow: "0 20px 50px rgba(60,35,10,0.45)" }}>
                <Tape x={-56} y={-26} deg={-36} color={TAPE[0]} />
                <Tape x={420} y={-26} deg={32} color={TAPE[1]} />
                <div style={{ color: SUMI, fontFamily: tegaki, fontSize: 84, lineHeight: 1.4 }}>ぜんぶ<br /><span style={marker()}>おすすめ！</span></div>
                <div style={{ color: "#7a6248", fontFamily: tegaki, fontSize: 38, marginTop: 26 }}>{storeName}　{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
