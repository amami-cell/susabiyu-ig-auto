// 大衆・音ハメ：曲のビート位置（fetch_beat.pyが解析）にカットとズームを正確に合わせる。
// 暗いステージにスポットライト、拍ごとにドン・ドンと写真が切り替わる。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { beatPhotos, beatMusic, beatTimes } from "./beatData";
import { oneLineFont } from "./fit";
import { AKA_DARK, KIIRO, KURO, SHIRO, Spot, fuchi } from "./taishu";
import { Flash } from "./cine";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const FPS = 30;

// 拍→フレーム
const BF = beatTimes.map((t) => Math.round(t * FPS));
// 最初のスライドは1.0秒以降の最初の拍から。1枚＝2拍。
const START = Math.max(0, BF.findIndex((f) => f >= FPS));
const AVG = BF.length > 1 ? Math.max(6, Math.round((BF[BF.length - 1] - BF[0]) / (BF.length - 1))) : 15;
const beatAt = (i: number) => (i < BF.length ? BF[i] : (BF[BF.length - 1] || 0) + (i - BF.length + 1) * AVG);
const N_SLIDES = Math.min(beatPhotos.length, 8);
const SLIDES = Array.from({ length: N_SLIDES }, (_, k) => ({
  from: beatAt(START + k * 2),
  to: beatAt(START + k * 2 + 2),
  midBeat: beatAt(START + k * 2 + 1),
  photo: beatPhotos[k],
}));
const SLIDES_END = SLIDES.length ? SLIDES[SLIDES.length - 1].to : FPS * 8;
const OUTRO = 64;
export const TBEAT_DUR = SLIDES_END + OUTRO;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 直近の拍からの経過で「ドンッ」の減衰パルスを作る
function pulse(f: number): number {
  let last = -999;
  for (let i = 0; i < BF.length; i++) {
    if (BF[i] <= f) last = BF[i]; else break;
  }
  const d = f - last;
  return d >= 0 && d < 12 ? Math.exp(-d / 3.2) : 0;
}

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const p = pulse(f);
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(180deg,#17100a 0%,#241409 55%,#120b06 100%)" }} />
      {/* 拍に合わせて赤い照明がフッと明るくなる */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(215,38,61," + (0.10 + 0.16 * p) + ") 0%, rgba(0,0,0,0) 55%)" }} />
      <Spot x="50%" y="-6%" color="255,190,120" opacity={0.22 + 0.1 * p} />
    </>
  );
};

const Slide: React.FC<{ s: (typeof SLIDES)[number]; idx: number }> = ({ s, idx }) => {
  const f = useCurrentFrame();
  if (f < s.from || f >= s.to) return null;
  const t = f - s.from;
  const p = pulse(f);
  const deg = idx % 2 === 0 ? -2.5 : 2.5;
  const inS = interpolate(t, [0, 4], [1.24, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const scale = inS * (1 + 0.055 * p);   // 拍ごとにドンッと押す
  const capS = interpolate(t, [2, 6], [2.0, 1], clamp);
  const capO = interpolate(t, [2, 5], [0, 1], clamp);
  const fs = oneLineFont(s.photo.caption, 860, 46, 2, 26);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "rotate(" + deg + "deg) scale(" + scale + ")" }}>
          <Img src={staticFile(s.photo.src)} style={{ maxWidth: 940, maxHeight: 1240, width: "auto", height: "auto",
            objectFit: "contain", border: "10px solid #f6ecd9", borderRadius: 8,
            boxShadow: "0 26px 70px rgba(0,0,0,0.65)", filter: "saturate(1.14) contrast(1.05)" }} />
        </div>
      </AbsoluteFill>
      {/* 黄札の品名（拍で登場） */}
      <div style={{ position: "absolute", bottom: 210, width: "100%", textAlign: "center", opacity: capO }}>
        <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10,
          padding: "12px 34px", transform: "rotate(" + (idx % 2 === 0 ? -1.5 : 1.5) + "deg) scale(" + capS + ")",
          color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: fs, whiteSpace: "nowrap",
          boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>{s.photo.caption}</span>
      </div>
      <Flash local={t} peak={0.24} />
    </AbsoluteFill>
  );
};

export const TaishuBeat: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const p = pulse(f);
  const introEnd = SLIDES.length ? SLIDES[0].from : FPS;
  // イントロ：ロゴが拍に合わせて脈打つ
  const iO = interpolate(f, [0, 6, introEnd - 6, introEnd], [0, 1, 1, 0], clamp);
  const iS = interpolate(f, [0, 10], [1.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  // クローズ
  const t = f - SLIDES_END;
  const oO = interpolate(t, [0, 10, OUTRO - 12, OUTRO], [0, 1, 1, 0], clamp);
  const oS = interpolate(t, [0, 10], [1.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(beatMusic)} volume={(ff) => interpolate(ff, [0, 4, TBEAT_DUR - 22, TBEAT_DUR], [0, 0.9, 0.9, 0], clamp)} />
      <Stage />
      {/* イントロ */}
      {f < introEnd && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
          <div style={{ textAlign: "center", transform: "scale(" + iS * (1 + 0.05 * p) + ")" }}>
            <Img src={staticFile("storelogo_white.png")} style={{ width: 560, height: "auto", objectFit: "contain",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))" }} />
            <div style={{ marginTop: 34 }}>
              <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10,
                padding: "10px 32px", transform: "rotate(-2deg)", color: AKA_DARK, fontFamily: goshi, fontWeight: 800,
                fontSize: 42, boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>音に乗せてどうぞ！</span>
            </div>
          </div>
        </AbsoluteFill>
      )}
      {/* 本編：1枚＝2拍で切り替え */}
      {SLIDES.map((s, i) => (
        <Slide key={i} s={s} idx={i} />
      ))}
      {/* クローズ */}
      {t >= 0 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
          <div style={{ textAlign: "center", transform: "scale(" + oS * (1 + 0.04 * p) + ") rotate(-2deg)" }}>
            <div style={{ color: KIIRO, fontFamily: fude, fontSize: 92, lineHeight: 1.35, ...fuchi(KURO, 7) }}>毎日元気に<br />営業中</div>
            <div style={{ marginTop: 24, color: SHIRO, fontFamily: fude, fontSize: 44, letterSpacing: 2, ...fuchi(KURO, 5) }}>{storeName}</div>
            <div style={{ marginTop: 12, color: SHIRO, fontFamily: goshi, fontSize: 30, letterSpacing: 2, ...fuchi(KURO, 4) }}>{handle}</div>
          </div>
        </AbsoluteFill>
      )}
      {/* 拍のフチ光（画面全体がわずかに明滅） */}
      <AbsoluteFill style={{ pointerEvents: "none", boxShadow: "inset 0 0 " + (60 + 120 * p) + "px rgba(215,38,61," + 0.12 * p + ")" }} />
    </AbsoluteFill>
  );
};
