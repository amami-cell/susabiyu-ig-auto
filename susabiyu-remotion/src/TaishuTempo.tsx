// 大衆・賑やかテンポ：烏丸「賑やか」(TempoStory)の構成（ロゴ導入→1枚ずつテンポ良く→締め）
// そのままに、墨×金 → 赤のれんストライプ×黄札×白フチ太筆の大衆トーンへ。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";
import { AKA_DARK, KIIRO, KURO, SHIRO, NorenBg, fuchi } from "./taishu";
import { Cine, punch, Flash } from "./cine";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const INTRO = 48;
const PER = 22;
const OUTRO = 56;
const N = tempoPhotos.length;
export const TTEMPO_DUR = INTRO + N * PER + OUTRO;

const Slide: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const scale = interpolate(f, [0, 10], [1.06, 1.0], { extrapolateRight: "clamp", easing: Easing.out(Easing.ease) }) * punch(f, 0.04, 6);
  const capY = interpolate(f, [2, 10], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const capO = interpolate(f, [2, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <NorenBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={staticFile(src)} style={{ maxWidth: "94%", maxHeight: 1300, objectFit: "contain", transform: "scale(" + scale + ") rotate(" + (i % 2 === 0 ? -1 : 1) + "deg)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)", border: "8px solid #f2e3c2", borderRadius: 6, filter: "saturate(1.12) contrast(1.04)" }} />
      </AbsoluteFill>
      {/* 黄札の品名 */}
      <div style={{ position: "absolute", bottom: 165, width: "100%", textAlign: "center", opacity: capO, transform: "translateY(" + capY + "px)" }}>
        <div style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "12px 34px",
          transform: "rotate(" + (i % 2 === 0 ? -1.5 : 1.5) + "deg)", boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
          <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: oneLineFont(caption, 900, 48, 2, 26), whiteSpace: "nowrap" }}>{caption}</span>
        </div>
      </div>
      <Flash local={f} peak={0.18} />
    </AbsoluteFill>
  );
};

const Intro: React.FC<{ storeName: string }> = ({ storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, INTRO - 8, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoS = interpolate(f, [0, 14], [1.6, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tagS = interpolate(f, [14, 20], [2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagO = f >= 14 ? 1 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
      <NorenBg />
      <div style={{ textAlign: "center" }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 620, height: "auto", objectFit: "contain", transform: "scale(" + logoS + ")",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.55))" }} />
        <div style={{ marginTop: 40, opacity: tagO, transform: "scale(" + tagS + ") rotate(-2deg)" }}>
          <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "12px 36px",
            color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 46, boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>本日のうまいもん</span>
        </div>
        <div style={{ marginTop: 26, color: SHIRO, fontFamily: goshi, fontSize: 30, letterSpacing: 2, ...fuchi(KURO, 4) }}>{storeName}</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ handle: string }> = ({ handle }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, OUTRO - 12, OUTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = interpolate(f, [2, 12], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
      <NorenBg />
      <div style={{ textAlign: "center", transform: "scale(" + s + ") rotate(-2deg)" }}>
        <div style={{ color: KIIRO, fontFamily: fude, fontSize: 96, lineHeight: 1.35, ...fuchi(KURO, 7) }}>毎日元気に<br />営業中</div>
        <div style={{ marginTop: 26, color: SHIRO, fontFamily: goshi, fontSize: 34, letterSpacing: 2, ...fuchi(KURO, 4) }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const TaishuTempo: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(tempoMusic)} volume={(f) => interpolate(f, [0, 15, TTEMPO_DUR - 22, TTEMPO_DUR], [0, 0.88, 0.88, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.08) saturate(1.2) brightness(1.02)">
        <Sequence durationInFrames={INTRO}>
          <Intro storeName={storeName} />
        </Sequence>
        {tempoPhotos.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Slide src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        <Sequence from={INTRO + N * PER} durationInFrames={OUTRO}>
          <Outro handle={handle} />
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
