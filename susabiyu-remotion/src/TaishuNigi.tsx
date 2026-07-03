// 大衆③「賑やか・大衆版」：既存の賑やか(tempo)の構成を大衆スキン化。
// 赤枠の写真カードが左右交互に傾いてポンポン切り替わり、黄帯に品名。テンポ1.3倍。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { Cine, punch } from "./cine";
import { AKA, AKA_DARK, KIIRO, SHIRO, KURO, NorenBg, Shuchusen, tpick, taishuMusic, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const INTRO = 38;
const PER = 18;                       // 旧tempoの22より速く＝1.2〜1.3倍のテンポ
const PHOTOS = tpick(6);
const OUTRO = 44;
export const TNIGI_DUR = INTRO + PHOTOS.length * PER + OUTRO;

const Slide: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const deg = i % 2 === 0 ? -3 : 3;
  const inY = interpolate(f, [0, 6], [90, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const z = punch(f, 0.05, 6);
  return (
    <AbsoluteFill>
      {/* 背景：写真の強ボカシ＋赤味 */}
      <AbsoluteFill>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(46px) brightness(0.5) saturate(1.4)", transform: "scale(1.25)" }} />
        <AbsoluteFill style={{ background: "rgba(163,18,38,0.35)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o, transform: "translateY(" + inY + "px)" }}>
        <div style={{ width: 850, height: 1130, background: SHIRO, padding: 18, borderRadius: 10, transform: "rotate(" + deg + "deg) scale(" + z + ")",
          border: "6px solid " + AKA, boxShadow: "0 26px 70px rgba(0,0,0,0.55)" }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "84%", objectFit: "cover", borderRadius: 6 }} />
          <div style={{ height: "16%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{ background: KIIRO, border: "4px solid " + KURO, borderRadius: 8, padding: "8px 26px",
              color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 46, whiteSpace: "nowrap" }}>{caption}</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TaishuNigi: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const iS = interpolate(f, [3, 11], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outStart = INTRO + PHOTOS.length * PER;
  const oO = interpolate(f, [outStart, outStart + 6, TNIGI_DUR - 8, TNIGI_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oS = interpolate(f, [outStart + 2, outStart + 10], [2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TNIGI_DUR - 18, TNIGI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.1) saturate(1.28) brightness(1.03)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <NorenBg />
            <Shuchusen color="rgba(255,255,255,0.3)" flash />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: SHIRO, fontFamily: fude, fontSize: 112, lineHeight: 1.25, ...fuchi(KURO, 7) }}>今夜も<br />賑やかに！</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Slide src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <NorenBg />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center" }}>
                <div style={{ color: KIIRO, fontFamily: fude, fontSize: 100, lineHeight: 1.3, ...fuchi(KURO, 7) }}>ご来店<br />お待ちしてます！</div>
                <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 38, marginTop: 26, ...fuchi(KURO, 4) }}>{storeName}　{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
