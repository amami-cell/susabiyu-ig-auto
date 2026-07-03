// 大衆②「掛け声ドン・ネオン版」＝夜のネオン居酒屋の世界観。
// ネオン管らしさ＝発光の脈動・床への照り返し・文字の反射で「本物の看板」に寄せる。
// チラシ(朱×紙)とは真逆の配色。フォントはRocknRoll One。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { Cine, punch, Flash } from "./cine";
import { NightBg, neon, tpick, taishuMusic } from "./taishu";

const { fontFamily: goshi } = loadGoshi();
const INTRO = 38;
const PER = 20;
const PHOTOS = tpick(8);
const OUTRO = 44;
export const TKOE_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const KOE = ["うまい！", "アツアツ！", "キンキン！", "どうぞ！", "おかわり！", "いくぞ！", "たまらん！", "乾杯！"];
const NEON = ["#ff2d78", "#ffbe3c", "#46c8ff", "#7dff6a"];   // ピンク・アンバー・シアン・グリーンのネオン管

// ネオン点灯のチラつき：点く瞬間に2回まばたきしてから安定する
function flicker(local: number): number {
  if (local < 0) return 0;
  if (local < 2) return 0.25;
  if (local < 3) return 1;
  if (local < 4) return 0.15;
  return 1;
}
// 点灯後のゆるい脈動（ネオン管の呼吸）
function pulse(f: number): number {
  return 0.92 + Math.sin(f * 0.35) * 0.08;
}

// ネオン文字＋下の反射（濡れたカウンターに映る感じ）
const NeonWord: React.FC<{ text: string; color: string; size: number; on: number; deg?: number; scale?: number }> = ({ text, color, size, on, deg = 0, scale = 1 }) => {
  const f = useCurrentFrame();
  const o = on * pulse(f);
  return (
    <div style={{ transform: "rotate(" + deg + "deg) scale(" + scale + ")", textAlign: "center" }}>
      <div style={{ opacity: o }}>
        <span style={{ fontFamily: goshi, fontWeight: 800, fontSize: size, whiteSpace: "nowrap",
          WebkitTextStroke: "1.5px rgba(255,255,255,0.85)", ...neon(color) } as React.CSSProperties}>{text}</span>
      </div>
      {/* 反射 */}
      <div style={{ opacity: o * 0.22, transform: "scaleY(-0.8) translateY(-14px)", filter: "blur(3px)",
        maskImage: "linear-gradient(180deg, rgba(0,0,0,0) 30%, #000 100%)", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0) 30%, #000 100%)" } as React.CSSProperties}>
        <span style={{ fontFamily: goshi, fontWeight: 800, fontSize: size, whiteSpace: "nowrap", ...neon(color) }}>{text}</span>
      </div>
    </div>
  );
};

const Beat: React.FC<{ src: string; i: number }> = ({ src, i }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, PER], [1.16, 1.05]) * punch(f, 0.06, 6);
  const deg = i % 2 === 0 ? -6 : 6;
  const on = flicker(f - 3);
  const s = interpolate(f, [3, 8], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const col = NEON[i % NEON.length];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0a14" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")", filter: "brightness(0.9) contrast(1.05)" }} />
      {/* 夜の店：上下を落とし、青紫の夜気を混ぜる */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,6,20,0.8) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 60%, rgba(8,5,16,0.88) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(200deg, rgba(60,40,140,0.16) 0%, rgba(0,0,0,0) 40%)", mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <NeonWord text={KOE[i % KOE.length]} color={col} size={126} on={on} deg={deg} scale={s} />
      </AbsoluteFill>
      {/* 掛け声の色が空間に照り返す */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 58%, " + col + "26 0%, rgba(0,0,0,0) 55%)", opacity: on * pulse(f) }} />
      <Flash local={f - 3} peak={0.18} />
    </AbsoluteFill>
  );
};

export const TaishuKakegoe: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iOn = flicker(f - 4);
  const iO = interpolate(f, [INTRO - 5, INTRO], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outStart = INTRO + PHOTOS.length * PER;
  const oOn = flicker(f - outStart - 3);
  const oO = interpolate(f, [TKOE_DUR - 8, TKOE_DUR], [1, 0], { extrapolateLeft: "clamp" });
  const glow = pulse(f);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0a14" }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 10, TKOE_DUR - 16, TKOE_DUR], [0, 0.92, 0.92, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine dark grade="contrast(1.14) saturate(1.24) brightness(1.02)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <NightBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ textAlign: "center", opacity: iOn }}>
                {/* ネオン看板：外枠白・内枠ピンクの二重管＋脈動 */}
                <div style={{ display: "inline-block", padding: "8px", borderRadius: 34, border: "3px solid rgba(255,255,255,0.65)",
                  boxShadow: "0 0 10px rgba(255,255,255,0.35)" }}>
                  <div style={{ padding: "44px 62px", borderRadius: 26, border: "4px solid #ff2d78",
                    boxShadow: "0 0 " + 22 * glow + "px #ff2d78, inset 0 0 " + 26 * glow + "px rgba(255,45,120,0.45)" }}>
                    <div style={{ fontFamily: goshi, fontSize: 94, ...neon("#ff2d78") }}>{storeName}</div>
                    <div style={{ fontFamily: goshi, fontSize: 48, marginTop: 18, ...neon("#ffbe3c") }}>今夜もやってます</div>
                  </div>
                </div>
              </div>
            </AbsoluteFill>
            {/* 看板の灯りが夜気ににじむ */}
            <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, rgba(255,45,120,0.14) 0%, rgba(0,0,0,0) 55%)", opacity: iOn * glow }} />
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Beat src={p.src} i={i} />
          </Sequence>
        ))}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <NightBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div>
                <NeonWord text="待ってるで！" color="#46c8ff" size={112} on={oOn} deg={-2} />
                <div style={{ textAlign: "center", marginTop: 6, opacity: oOn * glow }}>
                  <span style={{ fontFamily: goshi, fontSize: 40, ...neon("#ff2d78") }}>{handle}</span>
                </div>
              </div>
            </AbsoluteFill>
            <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, rgba(70,200,255,0.13) 0%, rgba(0,0,0,0) 55%)", opacity: oOn * glow }} />
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
