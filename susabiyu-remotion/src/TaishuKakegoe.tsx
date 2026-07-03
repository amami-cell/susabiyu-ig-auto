// 大衆②「掛け声ドン」：速いカットで料理が切り替わり、巨大な掛け声が
// 回転しながらドン！と入る。一番ワイワイ・元気なテンプレ。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { Cine, punch, Flash } from "./cine";
import { KIIRO, SHIRO, KURO, Shuchusen, NorenBg, tpick, taishuMusic, fuchi } from "./taishu";

const { fontFamily: goshi } = loadGoshi();
const { fontFamily: fude } = loadFude();
const INTRO = 32;
const PER = 20;
const PHOTOS = tpick(8);
const OUTRO = 42;
export const TKOE_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const KOE = ["うまい！", "アツアツ！", "キンキン！", "どうぞ！", "おかわり！", "いくぞ！", "たまらん！", "乾杯！"];
const COL = [KIIRO, SHIRO, KIIRO, "#7fd1a0", KIIRO, SHIRO, KIIRO, SHIRO];

const Beat: React.FC<{ src: string; i: number }> = ({ src, i }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, PER], [1.14, 1.04]) * punch(f, 0.07, 6);
  const deg = i % 2 === 0 ? -8 : 8;
  const s = interpolate(f, [2, 8], [3.0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(f, [2, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ") rotate(" + (i % 2 === 0 ? 0.6 : -0.6) + "deg)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.4) 100%)" }} />
      {f >= 2 && f < 9 && <Shuchusen color="rgba(255,255,255,0.5)" flash />}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "rotate(" + deg + "deg) scale(" + s + ")", opacity: o }}>
          <span style={{ color: COL[i % COL.length], fontFamily: goshi, fontWeight: 800, fontSize: 130, whiteSpace: "nowrap", ...fuchi(KURO, 8) }}>{KOE[i % KOE.length]}</span>
        </div>
      </AbsoluteFill>
      <Flash local={f} peak={0.32} />
    </AbsoluteFill>
  );
};

export const TaishuKakegoe: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iS = interpolate(f, [3, 10], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outStart = INTRO + PHOTOS.length * PER;
  const oS = interpolate(f, [outStart + 2, outStart + 10], [2.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const oO = interpolate(f, [outStart, outStart + 5, TKOE_DUR - 8, TKOE_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 10, TKOE_DUR - 16, TKOE_DUR], [0, 0.92, 0.92, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.12) saturate(1.32) brightness(1.04)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <NorenBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: SHIRO, fontFamily: fude, fontSize: 104, ...fuchi(KURO, 7) }}>{storeName}</div>
                <div style={{ color: KIIRO, fontFamily: goshi, fontSize: 56, marginTop: 20, ...fuchi(KURO, 5) }}>今日もやってます！</div>
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
            <NorenBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "scale(" + oS + ") rotate(-3deg)", textAlign: "center" }}>
                <div style={{ color: KIIRO, fontFamily: goshi, fontSize: 110, ...fuchi(KURO, 8) }}>待ってるで！</div>
                <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 38, marginTop: 26, ...fuchi(KURO, 4) }}>{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
