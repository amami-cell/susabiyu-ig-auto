// 大衆②「掛け声ドン・ネオン版」＝夜のネオン居酒屋の世界観。
// 暗闇＋ボケ光の背景に、掛け声がネオン管の発光文字でバチッと点灯する。
// チラシ(黄×赤)とは真逆の配色。フォントはRocknRoll One。
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

const Beat: React.FC<{ src: string; i: number }> = ({ src, i }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, PER], [1.16, 1.05]) * punch(f, 0.06, 6);
  const deg = i % 2 === 0 ? -6 : 6;
  const on = flicker(f - 3);
  const s = interpolate(f, [3, 8], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const col = NEON[i % NEON.length];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0a14" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")", filter: "brightness(0.92)" }} />
      {/* 夜の店っぽく上下を暗く落とす */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,5,14,0.75) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, rgba(8,5,14,0.85) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "rotate(" + deg + "deg) scale(" + s + ")", opacity: on }}>
          <span style={{ fontFamily: goshi, fontWeight: 800, fontSize: 128, whiteSpace: "nowrap", ...neon(col) }}>{KOE[i % KOE.length]}</span>
        </div>
      </AbsoluteFill>
      {/* 掛け声の色が下から照り返す */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 62%, " + col + "22 0%, rgba(0,0,0,0) 55%)", opacity: on }} />
      <Flash local={f - 3} peak={0.2} />
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
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0a14" }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 10, TKOE_DUR - 16, TKOE_DUR], [0, 0.92, 0.92, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.14) saturate(1.24) brightness(1.02)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <NightBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ textAlign: "center", opacity: iOn }}>
                {/* ネオン看板風の枠 */}
                <div style={{ display: "inline-block", padding: "46px 64px", borderRadius: 28, border: "5px solid #ff2d78",
                  boxShadow: "0 0 22px #ff2d78, inset 0 0 22px rgba(255,45,120,0.5)" }}>
                  <div style={{ fontFamily: goshi, fontSize: 96, ...neon("#ff2d78") }}>{storeName}</div>
                  <div style={{ fontFamily: goshi, fontSize: 50, marginTop: 18, ...neon("#ffbe3c") }}>今夜もやってます</div>
                </div>
              </div>
            </AbsoluteFill>
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
              <div style={{ textAlign: "center", opacity: oOn, transform: "rotate(-2deg)" }}>
                <div style={{ fontFamily: goshi, fontSize: 116, ...neon("#46c8ff") }}>待ってるで！</div>
                <div style={{ fontFamily: goshi, fontSize: 40, marginTop: 30, ...neon("#ff2d78") }}>{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
