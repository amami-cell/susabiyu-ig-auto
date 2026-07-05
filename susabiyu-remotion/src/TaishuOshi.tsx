// 大衆⑤「店主のイチオシ・黒板版」＝店先の手書き黒板の世界観。
// 木枠の緑黒板に、チョーク文字（Yomogi）と落書き（矢印・波線）で
// 写真が貼り出され、赤い「店主のイチオシ」ハンコがドン！と押される。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadChalk } from "@remotion/google-fonts/Yomogi";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { Cine, Flash } from "./cine";
import { AKA, BlackboardBg, Tex, Spot, tpick, taishuMusic } from "./taishu";

const { fontFamily: chalk } = loadChalk();
const { fontFamily: fude } = loadFude();
const INTRO = 48;
const PER = 38;
const PHOTOS = tpick(5);
const OUTRO = 56;
export const TOSHI_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const STAMP_AT = 14;   // 各皿でハンコが押されるフレーム
const CHALK = "#f2efe4";
const CHALK_Y = "#ffe9a3";   // 黄チョーク（差し色）

// 黒板の背景セット：チョークの粉・こすれ跡・飾り枠・電球の灯り
const BoardBg: React.FC = () => (
  <AbsoluteFill>
    <BlackboardBg />
    {/* 消し跡のこすれ（うっすら白いムラ） */}
    <div style={{ position: "absolute", left: 120, top: 420, width: 560, height: 260, background: "rgba(240,238,225,0.05)", filter: "blur(40px)", transform: "rotate(-8deg)" }} />
    <div style={{ position: "absolute", left: 420, top: 1300, width: 520, height: 300, background: "rgba(240,238,225,0.06)", filter: "blur(48px)", transform: "rotate(5deg)" }} />
    <Tex opacity={0.14} blend="overlay" />
    <Spot x="50%" y="-6%" color="255,214,150" opacity={0.2} />
    {/* チョークの飾り二重枠＋四隅の飾り */}
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", pointerEvents: "none" }}>
      <rect x="76" y="96" width="928" height="1728" rx="14" fill="none" stroke={CHALK} strokeWidth="4.5" opacity="0.75" />
      <rect x="96" y="116" width="888" height="1688" rx="10" fill="none" stroke={CHALK} strokeWidth="2" opacity="0.45" strokeDasharray="14 10" />
      {[[100, 120, 1], [980, 120, -1], [100, 1800, 1], [980, 1800, -1]].map(([cx, cy, d], i) => (
        <g key={i} opacity="0.8">
          <path d={"M " + (cx - 26 * d) + " " + cy + " q " + 26 * d + " 0 " + 26 * d + " " + (cy < 900 ? 26 : -26)} fill="none" stroke={CHALK_Y} strokeWidth="4" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill={CHALK_Y} />
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);

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
      <BoardBg />
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

export const TaishuOshi: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iY = interpolate(f, [3, 14], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const iBandS = interpolate(f, [16, 22], [2.0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iBandO = f >= 16 ? 1 : 0;
  const outStart = INTRO + PHOTOS.length * PER;
  const oO = interpolate(f, [outStart, outStart + 6, TOSHI_DUR - 8, TOSHI_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oY = interpolate(f, [outStart + 2, outStart + 12], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#274138" }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TOSHI_DUR - 18, TOSHI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.06) saturate(1.12) brightness(1.02)">
        {/* オープニング：王道と同じ構成（ロゴ→屋号→地名の朱帯）を黒板の上で */}
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <BoardBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "translateY(" + iY + "px) rotate(-2deg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
                <Img src={staticFile("storelogo_white.png")} style={{ width: 520, height: "auto", objectFit: "contain",
                  filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.55))" }} />
                <div style={{ color: CHALK, fontFamily: chalk, fontSize: 64, letterSpacing: 4 }}>本日の黒板メニュー</div>
                <div style={{ background: AKA, border: "4px solid " + CHALK, borderRadius: 8, padding: "10px 34px",
                  transform: "rotate(-1.5deg) scale(" + iBandS + ")", opacity: iBandO, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                  <span style={{ color: CHALK, fontFamily: fude, fontSize: 40, letterSpacing: 2 }}>京都・河原町三条</span>
                </div>
              </div>
            </AbsoluteFill>
            <Squiggle x={200} y={1560} w={680} local={f - 12} />
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Dish src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        {/* クローズ：王道と同じ構成（ロゴ→大きな一言→屋号→ハンドル）を黒板の上で */}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <BoardBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "translateY(" + oY + "px) rotate(-2deg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
                <Img src={staticFile("storelogo_white.png")} style={{ width: 440, height: "auto", objectFit: "contain",
                  filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.55))" }} />
                <div style={{ color: CHALK_Y, fontFamily: chalk, fontSize: 84, lineHeight: 1.4, textAlign: "center" }}>今日もにぎやかに<br />営業中</div>
                <div style={{ color: CHALK, fontFamily: chalk, fontSize: 46, letterSpacing: 2 }}>{storeName}</div>
                <div style={{ color: "#cfe3d6", fontFamily: chalk, fontSize: 36 }}>{handle}</div>
              </div>
            </AbsoluteFill>
            <Squiggle x={240} y={1620} w={600} local={f - outStart - 10} />
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
