// 大衆①「値札チラシ風」：赤のれん→筆文字「本日のおすすめ！」ドン→
// 料理全画面＋黄色い値札＋赤帯の品名がテンポよく続く。チラシのワイワイ感。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { Cine, punch, Flash } from "./cine";
import { KIIRO, SHIRO, KURO, Shuchusen, Fuda, AkaObi, NorenBg, tpick, taishuMusic, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const INTRO = 45;
const PER = 26;
const PHOTOS = tpick(6);
const OUTRO = 45;
export const TFUDA_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const KOE = ["うまい！", "アツアツ！", "自慢の一品！", "キンキン！", "揚げたて！", "名物！"];

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const s = interpolate(f, [4, 12], [2.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(f, [4, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <NorenBg />
      <Shuchusen color="rgba(255,255,255,0.35)" flash />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "scale(" + s + ") rotate(-3deg)", opacity: o, textAlign: "center" }}>
          <div style={{ color: SHIRO, fontFamily: fude, fontSize: 120, lineHeight: 1.25, ...fuchi(KURO, 7) }}>本日の<br />おすすめ！</div>
        </div>
      </AbsoluteFill>
      <Flash local={f - 4} peak={0.5} />
    </AbsoluteFill>
  );
};

const Dish: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, PER], [1.12, 1.02]) * punch(f, 0.06);
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.5) 100%)" }} />
      <Fuda text={KOE[i % KOE.length]} x={i % 2 === 0 ? 60 : 520} y={200} deg={i % 2 === 0 ? -8 : 6} local={f - 3} font={goshi} size={58} />
      <AkaObi text={caption} font={goshi} />
      <Flash local={f} peak={0.28} />
    </AbsoluteFill>
  );
};

export const TaishuFuda: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const outStart = INTRO + PHOTOS.length * PER;
  const oS = interpolate(f, [outStart + 3, outStart + 11], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const oO = interpolate(f, [outStart, outStart + 6, TFUDA_DUR - 8, TFUDA_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TFUDA_DUR - 18, TFUDA_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.12) saturate(1.3) brightness(1.03)">
        <Sequence durationInFrames={INTRO}><Intro /></Sequence>
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
                <div style={{ color: KIIRO, fontFamily: fude, fontSize: 96, lineHeight: 1.3, ...fuchi(KURO, 7) }}>毎日元気に<br />営業中！</div>
                <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 40, marginTop: 30, ...fuchi(KURO, 4) }}>{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
