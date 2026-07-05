// 大衆・見出し：烏丸「雑誌風」(TypoStory)の構成そのままに、上品な和モダン誌面 →
// 大衆週刊誌/スポーツ新聞の一面へ。ざら紙×網点×極太見出し×赤の角ハンコ。
// 提灯・祭りの道具は使わない（他テンプレと世界観を分ける）。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { typoPhotos, typoHeadline, typoUptempo } from "./typoData";
import { Halftone, Tex } from "./taishu";

const { fontFamily: goshi } = loadGoshi();
const { fontFamily: fude } = loadFude();
const PAPER = "#efe8d4";           // ざら紙
const INK = "#191510";             // 新聞の墨
const AKAI = "#c3271d";            // 見出しの赤
const TITLE = 72;
const PER = 48;
const OUTRO = 50;
const N = typoPhotos.length;
export const TSHIN_DUR = TITLE + N * PER + OUTRO;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 新聞のざら紙背景（網点＋紙質感＋罫線）
const PaperBg: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER }}>
    <Halftone opacity={0.12} color="rgba(60,45,25,0.65)" />
    <Tex opacity={0.14} blend="multiply" />
    <div style={{ position: "absolute", top: 44, left: 44, right: 44, bottom: 44, border: "3px solid " + INK }} />
    <div style={{ position: "absolute", top: 54, left: 54, right: 54, bottom: 54, border: "1px solid " + INK, opacity: 0.5 }} />
  </AbsoluteFill>
);

// 赤の角ハンコ（かすれ風の二重枠）
const KakuHanko: React.FC<{ text: string; size?: number }> = ({ text, size = 34 }) => (
  <div style={{ display: "inline-block", border: "4px solid " + AKAI, padding: "8px 14px", transform: "rotate(-3deg)",
    boxShadow: "inset 0 0 0 2px " + PAPER + ", inset 0 0 0 4px " + AKAI }}>
    <span style={{ color: AKAI, fontFamily: fude, fontSize: size, letterSpacing: 4, whiteSpace: "nowrap" }}>{text}</span>
  </div>
);

const Title: React.FC<{ headline: string; storeName: string }> = ({ headline, storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, TITLE - 10, TITLE], [0, 1, 1, 0], clamp);
  const kick = interpolate(f, [4, 14], [0, 1], clamp);
  const headS = interpolate(f, [8, 16], [1.6, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const headO = interpolate(f, [8, 14], [0, 1], clamp);
  const footO = interpolate(f, [30, 44], [0, 1], clamp);
  const parts = headline.split("、").filter(Boolean);
  const lines = parts.map((p, i) => (i < parts.length - 1 ? p + "、" : p));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <PaperBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 110px" }}>
        <div style={{ opacity: kick, marginBottom: 34 }}>
          <KakuHanko text="本日のおすすめ" size={40} />
        </div>
        <div style={{ opacity: headO, transform: "scale(" + headS + ")", transformOrigin: "left center" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ color: INK, fontFamily: goshi, fontWeight: 800, fontSize: 92, letterSpacing: 0, lineHeight: 1.32,
              textShadow: "3px 3px 0 rgba(25,21,16,0.12)" }}>{l}</div>
          ))}
        </div>
        <div style={{ height: 56 }} />
        <div style={{ opacity: footO, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 60, height: 8, background: AKAI }} />
          <span style={{ color: INK, fontFamily: goshi, fontSize: 34, letterSpacing: 2 }}>{storeName}　京都・河原町三条</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Slide: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const deg = i % 2 === 0 ? -2 : 2;
  const imgO = interpolate(f, [0, 8], [0, 1], clamp);
  const imgS = interpolate(f, [0, 10], [1.12, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const capO = interpolate(f, [10, 18], [0, 1], clamp);
  const capX = interpolate(f, [10, 20], [-40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const hankoS = interpolate(f, [16, 21], [2.4, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const hankoO = f >= 16 ? 1 : 0;
  return (
    <AbsoluteFill>
      <PaperBg />
      {/* 上の見出し帯（黒ベタ＋白抜き） */}
      <div style={{ position: "absolute", top: 96, left: 96, right: 96, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: INK, color: PAPER, fontFamily: goshi, fontSize: 30, padding: "8px 22px", letterSpacing: 4 }}>うまいもん速報</span>
        <span style={{ color: INK, fontFamily: goshi, fontSize: 26, letterSpacing: 2 }}>すさび湯三条</span>
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: imgO }}>
        <div style={{ transform: "rotate(" + deg + "deg) scale(" + imgS + ")", background: "#fff", padding: 16,
          border: "3px solid " + INK, boxShadow: "10px 12px 0 rgba(25,21,16,0.25)" }}>
          <Img src={staticFile(src)} style={{ display: "block", maxWidth: 800, maxHeight: 950, width: "auto", height: "auto",
            filter: "saturate(1.15) contrast(1.06)" }} />
        </div>
      </AbsoluteFill>
      {/* 品名＝極太の横見出し（赤ベタ帯） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 255, textAlign: "center", opacity: capO, transform: "translateX(" + capX + "px)" }}>
        <span style={{ display: "inline-block", background: AKAI, color: "#fff6e8", fontFamily: goshi, fontWeight: 800,
          fontSize: 56, padding: "14px 44px", letterSpacing: 2, whiteSpace: "nowrap", boxShadow: "8px 10px 0 rgba(25,21,16,0.28)", transform: "rotate(-1deg)" }}>{caption}</span>
      </div>
      {/* 旨の丸ハンコがドン */}
      <div style={{ position: "absolute", right: 110, top: 250, transform: "rotate(10deg) scale(" + hankoS + ")", opacity: hankoO }}>
        <div style={{ width: 150, height: 150, borderRadius: "50%", border: "7px solid " + AKAI, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: AKAI, fontFamily: fude, fontSize: 76 }}>旨</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ handle: string; storeName: string }> = ({ handle, storeName }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, OUTRO - 12, OUTRO], [0, 1, 1, 0], clamp);
  const s = interpolate(f, [4, 14], [1.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const fo = interpolate(f, [18, 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <PaperBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "scale(" + s + ")", textAlign: "center" }}>
          <div style={{ color: INK, fontFamily: goshi, fontWeight: 800, fontSize: 86, lineHeight: 1.4 }}>本日も<br />元気に営業中</div>
          <div style={{ margin: "36px 0 0", opacity: fo }}>
            <KakuHanko text="来てや" size={44} />
          </div>
          <div style={{ color: INK, fontFamily: goshi, fontSize: 32, marginTop: 40, opacity: fo }}>{storeName}　{handle}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TaishuShinbun: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoUptempo)} volume={(f) => interpolate(f, [0, 15, TSHIN_DUR - 22, TSHIN_DUR], [0, 0.85, 0.85, 0], clamp)} />
      <Sequence durationInFrames={TITLE}>
        <Title headline={typoHeadline} storeName={storeName} />
      </Sequence>
      {typoPhotos.map((p, i) => (
        <Sequence key={i} from={TITLE + i * PER} durationInFrames={PER}>
          <Slide src={p.src} caption={p.caption} i={i} />
        </Sequence>
      ))}
      <Sequence from={TITLE + N * PER} durationInFrames={OUTRO}>
        <Outro handle={handle} storeName={storeName} />
      </Sequence>
    </AbsoluteFill>
  );
};
