// 大衆⑤「店主のイチオシ・大衆版」：テープ留めのポラロイド写真に、
// 赤い「イチオシ！」ハンコがドン！と押される。人情味のある元気テンプレ。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { Cine, Flash } from "./cine";
import { AKA, KIIRO, SHIRO, KURO, NorenBg, Shuchusen, tpick, taishuMusic, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const INTRO = 40;
const PER = 38;
const PHOTOS = tpick(5);
const OUTRO = 45;
export const TOSHI_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const STAMP_AT = 12;   // 各皿でハンコが押されるフレーム

const Dish: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const deg = i % 2 === 0 ? -4 : 4;
  const inY = interpolate(f, [0, 7], [140, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  // ハンコ：大→小でドン、押した瞬間に写真が揺れる
  const st = f - STAMP_AT;
  const stS = interpolate(st, [0, 5], [3.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const stO = st < 0 ? 0 : 1;
  const kick = st >= 0 && st < 6 ? Math.sin(st * 2.2) * (6 - st) : 0;
  return (
    <AbsoluteFill>
      <NorenBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o, transform: "translateY(" + inY + "px) rotate(" + kick * 0.4 + "deg)" }}>
        <div style={{ position: "relative", width: 820, background: SHIRO, padding: "26px 26px 0", borderRadius: 6,
          transform: "rotate(" + deg + "deg)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
          {/* テープ */}
          <div style={{ position: "absolute", top: -22, left: 310, width: 200, height: 52, background: "rgba(255,236,170,0.85)", transform: "rotate(-3deg)", boxShadow: "0 4px 10px rgba(0,0,0,0.25)" }} />
          <Img src={staticFile(src)} style={{ width: "100%", height: 900, objectFit: "cover" }} />
          <div style={{ textAlign: "center", padding: "18px 0 24px" }}>
            <span style={{ color: KURO, fontFamily: fude, fontSize: 54 }}>{caption}</span>
          </div>
          {/* イチオシ！ハンコ */}
          <div style={{ position: "absolute", top: -40, right: -6, transform: "rotate(-14deg) scale(" + stS + ")", opacity: stO }}>
            <div style={{ width: 240, height: 240, borderRadius: "50%", border: "10px solid " + AKA, display: "flex", justifyContent: "center", alignItems: "center",
              background: "rgba(255,246,232,0.92)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
              <span style={{ color: AKA, fontFamily: fude, fontSize: 62, lineHeight: 1.15, textAlign: "center" }}>店主の<br />イチオシ</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {st >= 0 && st < 7 && <Shuchusen color="rgba(255,255,255,0.4)" flash />}
      {st >= 0 && <Flash local={st} peak={0.4} />}
    </AbsoluteFill>
  );
};

export const TaishuOshi: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iS = interpolate(f, [3, 11], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outStart = INTRO + PHOTOS.length * PER;
  const oO = interpolate(f, [outStart, outStart + 6, TOSHI_DUR - 8, TOSHI_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oS = interpolate(f, [outStart + 2, outStart + 10], [2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TOSHI_DUR - 18, TOSHI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.1) saturate(1.26) brightness(1.03)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <NorenBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: SHIRO, fontFamily: fude, fontSize: 110, lineHeight: 1.3, ...fuchi(KURO, 7) }}>店主の<br />イチオシ！</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Dish src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <NorenBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: KIIRO, fontFamily: fude, fontSize: 98, lineHeight: 1.3, ...fuchi(KURO, 7) }}>ぜんぶ<br />食べてって！</div>
                <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 38, marginTop: 26, ...fuchi(KURO, 4) }}>{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
