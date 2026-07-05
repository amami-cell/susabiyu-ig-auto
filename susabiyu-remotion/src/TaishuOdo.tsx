// 大衆・王道：「王道」(SushiStory)の流れ（イントロ→1枚ずつ→アウトロ）と
// テンポはそのままに、表現を大衆酒場に。額装×余白×細文字の上品な見せ方をやめ、
// 提灯・朱帯・黄札・白フチ太文字・傾きで「賑やかな店」の見せ方にする。
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photos, hasLogo, sushiUptempo } from "./photoData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Lanterns, fuchi } from "./taishu";
import { punch, Flash } from "./cine";

const { fontFamily: fude } = loadFont();
const { fontFamily: goshi } = loadGoshi();

const BG = "#2a120a";              // 提灯に照らされた店の壁色
const INTRO = 42;
const OUTRO = 42;
const SLIDE = 86;
const FADE = 16;
const TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];

// 店の空気（暖色の灯り＋赤の照り返し）
const Akari: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.30) 0%, rgba(0,0,0,0) 52%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 12% 108%, rgba(215,38,61,0.20) 0%, rgba(0,0,0,0) 45%)" }} />
  </AbsoluteFill>
);

const Logo: React.FC<{ size: number; opacity?: number }> = ({ size, opacity = 1 }) =>
  hasLogo ? (
    <Img
      src={staticFile("logo.png")}
      style={{ width: size, height: "auto", objectFit: "contain", opacity }}
    />
  ) : null;

const Intro: React.FC<{ storeName: string }> = ({ storeName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28 });
  const op = interpolate(frame, [0, 12, INTRO - 10, INTRO], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: op }}
    >
      <Akari />
      <Lanterns />
      <div
        style={{
          transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px) rotate(-2deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
        }}
      >
        <Logo size={150} />
        <div style={{ color: SHIRO, fontFamily: fude, fontSize: 92, letterSpacing: 2, ...fuchi(KURO, 6) }}>
          {storeName}
        </div>
        <div style={{ background: AKA, border: "4px solid " + SHIRO, borderRadius: 8, padding: "10px 34px",
          transform: "rotate(-1.5deg)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <span style={{ color: SHIRO, fontFamily: goshi, fontWeight: 800, fontSize: 40, letterSpacing: 2 }}>京都・河原町三条</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Slide: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const frame = useCurrentFrame();
  const deg = i % 2 === 0 ? -2.5 : 2.5;
  const op = interpolate(frame, [0, FADE, SLIDE - FADE, SLIDE], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, SLIDE], [1.06, 1.16], { extrapolateRight: "clamp" });
  const z = punch(frame, 0.05, 8);
  // 黄札：ハンコみたいにドン
  const tagS = interpolate(frame, [FADE, FADE + 6], [2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagO = interpolate(frame, [FADE, FADE + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const capOp = interpolate(frame, [FADE, FADE + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <AbsoluteFill>
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(34px) brightness(0.55) saturate(1.5)",
            transform: `scale(${1.25 * scale})`,
          }}
        />
        <AbsoluteFill style={{ background: "rgba(163,18,38,0.28)" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(42,18,10,0.6) 0%, rgba(42,18,10,0.08) 24%, rgba(42,18,10,0.08) 55%, rgba(42,18,10,0.9) 100%)",
        }}
      />
      <Akari />
      <Lanterns />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", transform: `rotate(${deg}deg) scale(${z})` }}>
          <div
            style={{
              overflow: "hidden",
              border: "8px solid #f2e3c2",
              borderRadius: 6,
              boxShadow: "0 26px 70px rgba(0,0,0,0.6)",
              lineHeight: 0,
            }}
          >
            <Img
              src={src}
              style={{
                display: "block",
                maxWidth: 1080 - 150,
                maxHeight: 980,
                width: "auto",
                height: "auto",
                filter: "saturate(1.15) contrast(1.05) brightness(1.02)",
              }}
            />
          </div>
          {/* 黄札の掛け声（傾けてドン） */}
          <div style={{ position: "absolute", top: -40, left: -34, transform: `rotate(-8deg) scale(${tagS})`, opacity: tagO,
            background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "10px 24px",
            boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
            <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 40, whiteSpace: "nowrap" }}>{TAG[i % TAG.length]}</span>
          </div>
        </div>
      </AbsoluteFill>
      {/* 品名は朱帯にドンと大きく */}
      {caption ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 265, textAlign: "center", opacity: capOp }}>
          <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 8,
            padding: "16px 46px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
            <span style={{ color: SHIRO, fontFamily: fude, fontSize: oneLineFont(caption, 880, 62, 2, 30), letterSpacing: 2, whiteSpace: "nowrap" }}>
              {caption}
            </span>
          </div>
        </div>
      ) : null}
      <Flash local={frame} peak={0.2} />
    </AbsoluteFill>
  );
};

const BrandBottom: React.FC<{ handle: string; total: number }> = ({ handle, total }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 16, total - 14, total], [0, 0.95, 0.95, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 170,
        width: "100%",
        textAlign: "center",
        opacity: op,
        color: SHIRO,
        fontFamily: goshi,
        fontSize: 28,
        letterSpacing: 2,
        ...fuchi(KURO, 4),
      }}
    >
      {handle}
    </div>
  );
};

const Outro: React.FC<{ storeName: string; handle: string }> = ({ storeName, handle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const op = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", opacity: op }}>
      <Akari />
      <Lanterns />
      <div
        style={{
          transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px) rotate(-2deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Logo size={130} />
        <div style={{ color: KIIRO, fontFamily: fude, fontSize: 88, letterSpacing: 2, lineHeight: 1.3, textAlign: "center", ...fuchi(KURO, 6) }}>
          今日もにぎやかに<br />営業中
        </div>
        <div style={{ color: SHIRO, fontFamily: fude, fontSize: 46, letterSpacing: 2, ...fuchi(KURO, 5) }}>{storeName}</div>
        <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 30, letterSpacing: 2, ...fuchi(KURO, 4) }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const TaishuOdo: React.FC<{ storeName?: string; handle?: string }> = ({
  storeName = "",
  handle = "@susabiyu_sanjyo",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const slidesStart = INTRO;
  const slidesTotal = photos.length * (SLIDE - FADE) + FADE;
  const outroStart = slidesStart + slidesTotal;
  const globalOp = interpolate(frame, [0, 10, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio
        src={staticFile(sushiUptempo)}
        volume={(f) =>
          interpolate(f, [0, 28, durationInFrames - 45, durationInFrames], [0, 0.5, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <AbsoluteFill style={{ opacity: globalOp }}>
        <Sequence durationInFrames={INTRO}>
          <Intro storeName={storeName} />
        </Sequence>

        {photos.map((p, i) => (
          <Sequence key={i} from={slidesStart + i * (SLIDE - FADE)} durationInFrames={SLIDE}>
            <Slide src={staticFile(p.src)} caption={p.caption} i={i} />
          </Sequence>
        ))}

        <Sequence from={slidesStart} durationInFrames={slidesTotal}>
          <BrandBottom handle={handle} total={slidesTotal} />
        </Sequence>

        <Sequence from={outroStart} durationInFrames={OUTRO}>
          <Outro storeName={storeName} handle={handle} />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
