// すさび湯三条・上品リール：AI/実写クリップを“ゆっくり・上品”に見せる。
// 前回の音ハメ版が「うるさい/下品」だった反省 → カット速度を抑え、緩いクロスフェード＋
// 静かなズーム＋暖色グレーディング＋控えめロゴのみ。BGMは控えめ。
import { AbsoluteFill, OffthreadVideo, Img, Audio, Sequence, staticFile,
  useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/ShipporiMincho";
import { clips, clipMusic } from "./clipData";
import { KURO, SHIRO, fuchi } from "./taishu";
import { Cine } from "./cine";

const { fontFamily: serif } = loadSerif();
const INTRO = 42;     // ロゴの導入（約1.4s）
const CLIP = 108;     // 1クリップの表示（約3.6s）
const XF = 24;        // クロスフェード（約0.8s）
const OUTRO = 60;     // 締め（約2s）
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const N = Math.max(clips.length, 0);
// 尺：イントロ + クリップ数×(CLIP-XF) + XF + アウトロ（クリップ0本ならロゴのみの短尺）
export const CINEREEL_DUR = N > 0 ? INTRO + N * (CLIP - XF) + XF + OUTRO : INTRO + 90 + OUTRO;

function vsrc(s: string) {
  return /^https?:\/\//.test(s) ? s : staticFile(s);
}

const Clip: React.FC<{ c: (typeof clips)[number]; idx: number }> = ({ c, idx }) => {
  const f = useCurrentFrame();               // Sequence内ローカルフレーム
  // クロスフェード：頭XFで入り、末尾XFで抜ける（隣と重なって滑らかに繋がる）
  const opacity = interpolate(f, [0, XF, CLIP - XF, CLIP], [0, 1, 1, 0], clamp);
  // 静かなズーム（1.0→1.05）＝生きてる感だけ、動きすぎない
  const scale = interpolate(f, [0, CLIP], [1.0, 1.05], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        <OffthreadVideo
          src={vsrc(c.src)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
        />
      </AbsoluteFill>
      {c.caption ? (
        <div style={{ position: "absolute", bottom: 150, width: "100%", textAlign: "center" }}>
          <span style={{ color: SHIRO, fontFamily: serif, fontSize: 40, letterSpacing: 2, ...fuchi(KURO, 4) }}>
            {c.caption}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const CineReel: React.FC<{ storeName?: string; handle?: string }> = ({
  storeName = "すさび湯三条", handle = "@susabiyu_sanjyo",
}) => {
  const f = useCurrentFrame();
  const introO = interpolate(f, [0, 8, INTRO - 6, INTRO], [0, 1, 1, 0], clamp);
  const outroStart = CINEREEL_DUR - OUTRO;
  const to = f - outroStart;
  const outroO = interpolate(to, [0, 12, OUTRO - 12, OUTRO], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      <Audio src={staticFile(clipMusic)} volume={(ff) =>
        interpolate(ff, [0, 12, CINEREEL_DUR - 20, CINEREEL_DUR], [0, 0.7, 0.7, 0], clamp)} />
      <Cine>
        {/* 本編クリップ（緩く重ねて繋ぐ） */}
        {clips.map((c, i) => (
          <Sequence key={i} from={INTRO + i * (CLIP - XF)} durationInFrames={CLIP}>
            <Clip c={c} idx={i} />
          </Sequence>
        ))}
      </Cine>

      {/* イントロ：ロゴがそっと出る */}
      {f < INTRO && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: introO }}>
          <Img src={staticFile("storelogo_white.png")} style={{ width: 520, height: "auto", objectFit: "contain",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.55))" }} />
        </AbsoluteFill>
      )}

      {/* アウトロ：店名＋ハンドル */}
      {to >= 0 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: outroO }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: SHIRO, fontFamily: serif, fontSize: 58, letterSpacing: 3, ...fuchi(KURO, 5) }}>{storeName}</div>
            <div style={{ marginTop: 16, color: SHIRO, fontFamily: serif, fontSize: 30, letterSpacing: 2, ...fuchi(KURO, 4) }}>{handle}</div>
            <div style={{ marginTop: 10, color: SHIRO, fontFamily: serif, fontSize: 24, letterSpacing: 4, opacity: 0.85 }}>河原町三条</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
