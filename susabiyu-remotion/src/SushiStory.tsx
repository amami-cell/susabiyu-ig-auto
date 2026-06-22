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
import { photos, hasLogo } from "./photoData";

const { fontFamily: brush } = loadFont();

const BG = "#140b07";
const GOLD = "#d4a574";
const INTRO = 42;
const OUTRO = 42;
const SLIDE = 86;
const FADE = 16;
const MARGIN = 96;

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
        <div style={{ color: GOLD, fontFamily: brush, fontSize: 52, letterSpacing: 10, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>
          {storeName}
        </div>
        <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: brush, fontSize: 26, letterSpacing: 6 }}>
          京都・河原町三条
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Slide: React.FC<{ src: string; caption: string }> = ({ src, caption }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, FADE, SLIDE - FADE, SLIDE], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, SLIDE], [1.06, 1.16], { extrapolateRight: "clamp" });
  const drift = interpolate(frame, [0, SLIDE], [-10, 10]);
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
            filter: "blur(34px) brightness(0.32)",
            transform: `scale(${1.25 * scale})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(20,11,7,0.55) 0%, rgba(20,11,7,0.12) 24%, rgba(20,11,7,0.12) 55%, rgba(20,11,7,0.92) 100%)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 1080 - MARGIN * 2,
            height: 1040,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(212,165,116,0.35)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `translateX(${drift}px) scale(${scale})`,
            }}
          />
        </div>
      </AbsoluteFill>
      {caption ? (
        <div
          style={{
            position: "absolute",
            bottom: 300,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: capOp,
            transform: `translateY(${capY}px)`,
          }}
        >
          <div style={{ width: 56, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, marginBottom: 22 }} />
          <div style={{ color: "#fff", fontFamily: brush, fontSize: 62, letterSpacing: 6, textShadow: "0 2px 22px rgba(0,0,0,0.9)" }}>
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
      <div style={{ color: GOLD, fontFamily: brush, fontSize: 30, letterSpacing: 8, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
        {storeName}
      </div>
    </div>
  );
};

const BrandBottom: React.FC<{ handle: string; total: number }> = ({ handle, total }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 16, total - 14, total], [0, 0.8, 0.8, 0], {
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
        color: "rgba(255,255,255,0.85)",
        fontFamily: brush,
        fontSize: 26,
        letterSpacing: 4,
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
        <div style={{ color: GOLD, fontFamily: brush, fontSize: 48, letterSpacing: 10 }}>{storeName}</div>
        <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div style={{ color: "rgba(255,255,255,0.9)", fontFamily: brush, fontSize: 30, letterSpacing: 4 }}>{handle}</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: brush, fontSize: 24, letterSpacing: 4, marginTop: 6 }}>
          ご来店お待ちしております
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SushiStory: React.FC<{ storeName?: string; handle?: string }> = ({
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
        src={staticFile("bgm.mp3")}
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
            <Slide src={staticFile(p.src)} caption={p.caption} />
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
