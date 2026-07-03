// 大衆⑤「店主のイチオシ・黒板版」＝店先の手書き黒板の世界観。
// 木枠の緑黒板に、チョーク文字（Yomogi）と落書き（矢印・波線）で
// 写真が貼り出され、赤い「店主のイチオシ」ハンコがドン！と押される。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadChalk } from "@remotion/google-fonts/Yomogi";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { Cine, Flash } from "./cine";
import { AKA, BlackboardBg, tpick, taishuMusic } from "./taishu";

const { fontFamily: chalk } = loadChalk();
const { fontFamily: fude } = loadFude();
const INTRO = 42;
const PER = 38;
const PHOTOS = tpick(5);
const OUTRO = 46;
export const TOSHI_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const STAMP_AT = 14;   // 各皿でハンコが押されるフレーム
const CHALK = "#f2efe4";

// チョークの落書き：ぐるっと波線の下線（描かれていくアニメ）
const Squiggle: React.FC<{ x: number; y: number; w: number; local: number }> = ({ x, y, w, local }) => {
  const prog = interpolate(local, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pts = [];
  const N = 26;
  for (let i = 0; i <= N * prog; i++) {
    const t = i / N;
    pts.push(x + t * w + "," + (y + Math.sin(t * Math.PI * 5) * 9));
  }
  if (pts.length < 2) return null;
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", pointerEvents: "none" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={CHALK} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
};

// チョークの手書き矢印
const Arrow: React.FC<{ x: number; y: number; deg: number; local: number }> = ({ x, y, deg, local }) => {
  const o = interpolate(local, [0, 5], [0, 0.95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "rotate(" + deg + "deg)", opacity: o }}>
      <svg width="150" height="90" viewBox="0 0 150 90">
        <path d="M6 66 Q 60 10 132 34" fill="none" stroke={CHALK} strokeWidth="7" strokeLinecap="round" />
        <path d="M112 18 L 136 34 L 108 48" fill="none" stroke={CHALK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const Dish: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const deg = i % 2 === 0 ? -3 : 3;
  const inY = interpolate(f, [0, 7], [120, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  // ハンコ：大→小でドン、押した瞬間に写真が揺れる
  const st = f - STAMP_AT;
  const stS = interpolate(st, [0, 5], [3.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const stO = st < 0 ? 0 : 1;
  const kick = st >= 0 && st < 6 ? Math.sin(st * 2.2) * (6 - st) : 0;
  return (
    <AbsoluteFill>
      <BlackboardBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o, transform: "translateY(" + inY + "px) rotate(" + kick * 0.4 + "deg)" }}>
        <div style={{ position: "relative", width: 800, transform: "rotate(" + deg + "deg)" }}>
          {/* 黒板に貼った写真（白フチ＋画鋲がわりのチョーク留め） */}
          <div style={{ background: "#f5f2e8", padding: "20px 20px 0", boxShadow: "0 22px 60px rgba(0,0,0,0.6)" }}>
            <Img src={staticFile(src)} style={{ width: "100%", height: 880, objectFit: "cover" }} />
            <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
              <span style={{ color: "#2c2418", fontFamily: chalk, fontSize: 52 }}>{caption}</span>
            </div>
          </div>
          {/* 店主のイチオシ！ハンコ（ここだけ赤で目立たせる） */}
          <div style={{ position: "absolute", top: -46, right: -10, transform: "rotate(-14deg) scale(" + stS + ")", opacity: stO }}>
            <div style={{ width: 236, height: 236, borderRadius: "50%", border: "10px solid " + AKA, display: "flex", justifyContent: "center", alignItems: "center",
              background: "rgba(250,244,230,0.94)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <span style={{ color: AKA, fontFamily: fude, fontSize: 48, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap" }}>店主の<br />イチオシ</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {/* チョーク落書き：波線＋矢印 */}
      <Squiggle x={220} y={1660} w={640} local={f - 8} />
      <Arrow x={90} y={330} deg={-16} local={f - STAMP_AT - 2} />
      {st >= 0 && <Flash local={st} peak={0.28} />}
    </AbsoluteFill>
  );
};

export const TaishuOshi: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iS = interpolate(f, [3, 11], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const outStart = INTRO + PHOTOS.length * PER;
  const oO = interpolate(f, [outStart, outStart + 6, TOSHI_DUR - 8, TOSHI_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oS = interpolate(f, [outStart + 2, outStart + 10], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#274138" }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TOSHI_DUR - 18, TOSHI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.06) saturate(1.12) brightness(1.02)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <BlackboardBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: CHALK, fontFamily: chalk, fontSize: 108, lineHeight: 1.35 }}>本日の<br />黒板メニュー</div>
              </div>
            </AbsoluteFill>
            <Squiggle x={200} y={1200} w={680} local={f - 10} />
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Dish src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <BlackboardBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: CHALK, fontFamily: chalk, fontSize: 96, lineHeight: 1.4 }}>ぜんぶ<br />食べてって！</div>
                <div style={{ color: "#cfe3d6", fontFamily: chalk, fontSize: 40, marginTop: 26 }}>{handle}</div>
              </div>
            </AbsoluteFill>
            <Squiggle x={240} y={1310} w={600} local={f - outStart - 8} />
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
