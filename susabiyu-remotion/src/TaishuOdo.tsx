// 大衆・王道：烏丸で保管する「王道」(SushiStory)の構成・テンポそのままに、
// 色味を大衆酒場（提灯色＝暗め×暖色の灯り×朱）へ振ったバージョン。
// 金×墨の上品トーン → 朱×提灯オレンジ。品名には掛け声タグを添える。
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
import { photos, hasLogo, sushiMusic } from "./photoData";
import { oneLineFont } from "./fit";

const { fontFamily: brush } = loadFont();
const { fontFamily: goshi } = loadGoshi();

const BG = "#1a0c06";              // 暖かい闇（元:#140b07 の墨色より赤茶寄り）
const AKA = "#d7263d";             // 朱
const HONO = "#ffcf87";            // 提灯の灯り色（元:GOLD #d4a574 の代わり）
const INTRO = 42;
const OUTRO = 42;
const SLIDE = 86;
const FADE = 16;
const MARGIN = 96;
const TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];

// 提灯の灯りが差す暖色レイヤー（全場面共通の「色味」の要）
const Akari: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% -6%, rgba(255,150,60,0.22) 0%, rgba(0,0,0,0) 50%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 12% 108%, rgba(215,38,61,0.16) 0%, rgba(0,0,0,0) 45%)" }} />
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
      <div
        style={{
          transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
        }}
      >
        <Logo size={170} />
        <div style={{ color: HONO, fontFamily: brush, fontSize: 56, letterSpacing: 8, textShadow: "0 0 30px rgba(255,150,60,0.45), 0 2px 14px rgba(0,0,0,0.7)" }}>
          {storeName}
        </div>
        <div style={{ width: 110, height: 3, background: `linear-gradient(90deg, transparent, ${AKA}, transparent)` }} />
        <div style={{ color: "rgba(255,226,190,0.85)", fontFamily: brush, fontSize: 26, letterSpacing: 6 }}>
          京都・河原町三条
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Slide: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, FADE, SLIDE - FADE, SLIDE], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, SLIDE], [1.06, 1.16], { extrapolateRight: "clamp" });
  const capOp = interpolate(frame, [FADE, FADE + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capY = interpolate(frame, [FADE, FADE + 14], [16, 0], {
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
            filter: "blur(34px) brightness(0.42) saturate(1.4)",
            transform: `scale(${1.25 * scale})`,
          }}
        />
      </AbsoluteFill>
      {/* 墨のグラデ → 赤茶の暖色グラデに */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(26,12,6,0.55) 0%, rgba(26,12,6,0.10) 24%, rgba(26,12,6,0.10) 55%, rgba(26,12,6,0.94) 100%)",
        }}
      />
      <Akari />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "3px solid rgba(215,38,61,0.75)",
            boxShadow: "0 0 40px rgba(255,120,50,0.18), 0 24px 70px rgba(0,0,0,0.6)",
            lineHeight: 0,
          }}
        >
          <Img
            src={src}
            style={{
              display: "block",
              maxWidth: 1080 - MARGIN * 2,
              maxHeight: 1040,
              width: "auto",
              height: "auto",
              filter: "saturate(1.12) contrast(1.04)",
            }}
          />
        </div>
      </AbsoluteFill>
      {caption ? (
        <div
          style={{
            position: "absolute",
            bottom: 285,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: capOp,
            transform: `translateY(${capY}px)`,
          }}
        >
          {/* 掛け声タグ（朱の座布団） */}
          <div style={{ background: AKA, borderRadius: 8, padding: "8px 26px", transform: "rotate(-1.5deg)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>
            <span style={{ color: "#fff3e2", fontFamily: goshi, fontWeight: 800, fontSize: 34, letterSpacing: 2 }}>{TAG[i % TAG.length]}</span>
          </div>
          <div style={{ color: "#fff", fontFamily: brush, fontSize: oneLineFont(caption, 980, 66, 6, 30), letterSpacing: 5, whiteSpace: "nowrap", textShadow: "0 0 26px rgba(255,140,60,0.4), 0 2px 22px rgba(0,0,0,0.9)" }}>
            {caption}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const BrandTop: React.FC<{ storeName: string; total: number }> = ({ storeName, total }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 16, total - 14, total], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        opacity: op,
      }}
    >
      <Logo size={64} opacity={0.95} />
      <div style={{ color: HONO, fontFamily: brush, fontSize: 32, letterSpacing: 7, textShadow: "0 0 20px rgba(255,150,60,0.4), 0 2px 12px rgba(0,0,0,0.85)" }}>
        {storeName}
      </div>
    </div>
  );
};

const BrandBottom: React.FC<{ handle: string; total: number }> = ({ handle, total }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 16, total - 14, total], [0, 0.85, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 175,
        width: "100%",
        textAlign: "center",
        opacity: op,
        color: "rgba(255,232,200,0.9)",
        fontFamily: goshi,
        fontSize: 26,
        letterSpacing: 3,
        textShadow: "0 2px 12px rgba(0,0,0,0.9)",
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
      <div
        style={{
          transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        <Logo size={150} />
        <div style={{ color: HONO, fontFamily: brush, fontSize: 52, letterSpacing: 8, textShadow: "0 0 30px rgba(255,150,60,0.45)" }}>{storeName}</div>
        <div style={{ width: 100, height: 3, background: `linear-gradient(90deg, transparent, ${AKA}, transparent)` }} />
        <div style={{ color: "rgba(255,240,220,0.95)", fontFamily: goshi, fontSize: 30, letterSpacing: 3 }}>{handle}</div>
        <div style={{ color: "rgba(255,226,190,0.8)", fontFamily: brush, fontSize: 28, letterSpacing: 4, marginTop: 6 }}>
          今日もにぎやかに営業中！
        </div>
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
        src={staticFile(sushiMusic)}
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
          <BrandTop storeName={storeName} total={slidesTotal} />
        </Sequence>
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
