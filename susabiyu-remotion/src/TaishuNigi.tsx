// 大衆③「賑やか・手書きノート版」＝クラフト紙×手書きマーカーの世界観。
// 紙のざらつき・ランプの灯り・コーヒー染み・ちぎれたマステで「本物の紙もの」に寄せる。
// フォントは手書き（Yusei Magic）＋蛍光マーカー下線。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadTegaki } from "@remotion/google-fonts/YuseiMagic";
import { Cine, punch } from "./cine";
import { KraftBg, Tex, Spot, marker, tpick, taishuMusic } from "./taishu";

const { fontFamily: tegaki } = loadTegaki();
const INTRO = 38;
const PER = 24;
const PHOTOS = tpick(6);
const OUTRO = 44;
export const TNIGI_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const SUMI = "#3a2a1a";                 // クラフト紙に合う濃い茶
const TAPE = ["rgba(255,170,190,0.75)", "rgba(160,215,255,0.75)", "rgba(190,235,160,0.75)", "rgba(255,225,140,0.8)"];
const MEMO = ["これ絶対！", "人気No.1", "みんな頼む", "推しです", "リピ確定", "売切御免"];

// クラフト紙の背景セット（紙質感＋ランプの灯り＋コーヒー染み）
const PaperBg: React.FC = () => (
  <AbsoluteFill>
    <KraftBg />
    <Tex opacity={0.22} blend="multiply" />
    <Spot x="30%" y="-4%" color="255,210,140" opacity={0.28} />
    {/* コーヒー染みの輪じみ */}
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", opacity: 0.16 }}>
      <circle cx="950" cy="240" r="86" fill="none" stroke="#6b4a26" strokeWidth="14" />
      <circle cx="950" cy="240" r="70" fill="none" stroke="#6b4a26" strokeWidth="4" opacity="0.6" />
      <circle cx="110" cy="1730" r="60" fill="none" stroke="#6b4a26" strokeWidth="10" opacity="0.8" />
    </svg>
    {/* 周辺減光でしっとり */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 45% 40%, rgba(0,0,0,0) 55%, rgba(50,30,10,0.32) 100%)" }} />
  </AbsoluteFill>
);

// マスキングテープ1本（両端ちぎれ＋半透明）
const Tape: React.FC<{ x: number; y: number; deg: number; color: string }> = ({ x, y, deg, color }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 190, height: 52, background: color,
    clipPath: "polygon(0 6%, 4% 0, 96% 4%, 100% 10%, 98% 92%, 94% 100%, 5% 96%, 2% 88%)",
    transform: "rotate(" + deg + "deg)", boxShadow: "0 3px 8px rgba(60,40,20,0.3)", mixBlendMode: "multiply" } as React.CSSProperties} />
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
      <PaperBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
        <div style={{ position: "relative", transform: "rotate(" + deg + "deg) scale(" + s + ")" }}>
          {/* 印画紙：下辺厚めのスナップ写真。紙の重なり影を2段で */}
          <div style={{ width: 840, background: "#fbf6ea", padding: "24px 24px 0",
            boxShadow: "0 6px 14px rgba(60,35,10,0.3), 0 26px 60px rgba(60,35,10,0.45)" }}>
            <Img src={staticFile(src)} style={{ width: "100%", height: 980, objectFit: "cover", boxShadow: "inset 0 0 20px rgba(0,0,0,0.2)" }} />
            <div style={{ textAlign: "center", padding: "18px 0 26px" }}>
              <span style={{ display: "inline-block", color: SUMI, fontFamily: tegaki, fontSize: 58, whiteSpace: "nowrap",
                ...(mw > 0 ? { backgroundImage: "linear-gradient(transparent 58%, rgba(255,220,60,0.75) 58%, rgba(255,220,60,0.75) 92%, transparent 92%)", backgroundRepeat: "no-repeat", backgroundSize: mw + "% 100%" } : {}) }}>{caption}</span>
            </div>
          </div>
          {/* 角のマスキングテープ2本 */}
          <Tape x={-60} y={-24} deg={-38} color={tape} />
          <Tape x={720} y={-24} deg={34} color={TAPE[(i + 1) % TAPE.length]} />
          {/* 赤ペンのひとことメモ＋丸囲み */}
          <div style={{ position: "absolute", right: 60, bottom: 130, transform: "rotate(6deg)", opacity: memoO }}>
            <span style={{ color: "#c2452e", fontFamily: tegaki, fontSize: 46, whiteSpace: "nowrap" }}>{MEMO[i % MEMO.length]}</span>
            <svg width="300" height="110" viewBox="0 0 300 110" style={{ position: "absolute", left: -18, top: -22 }}>
              <ellipse cx="150" cy="55" rx="142" ry="48" fill="none" stroke="#c2452e" strokeWidth="4" opacity="0.8"
                strokeDasharray="640" strokeDashoffset={interpolate(memoO, [0, 1], [640, 0])} />
            </svg>
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
      <Cine grade="contrast(1.05) saturate(1.12) sepia(0.06)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <PaperBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: SUMI, fontFamily: tegaki, fontSize: 104, lineHeight: 1.35, textShadow: "0 2px 0 rgba(255,246,220,0.4)" }}>
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
            <PaperBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ position: "relative", transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center",
                background: "#fbf6ea", padding: "56px 76px", boxShadow: "0 6px 14px rgba(60,35,10,0.3), 0 26px 60px rgba(60,35,10,0.45)" }}>
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
