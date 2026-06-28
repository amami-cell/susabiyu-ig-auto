import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { kanjiNum } from "./fit";

const { fontFamily: mincho } = loadFont();
const PAPER = "#efe7d6";
const INK = "#2a241c";
const SEAL = "#b4402f";
const SUB = "#8a7e6c";

// 縦書きのお品書き。各品ごとに「料理名（縦書き・上）＋その写真（下）」を1列にまとめ、
// 列を右から左へ並べる。名前と写真が上下で隣り合うので対応が一目でわかる。
const COL = 238;
const PHOTO = 230;       // 写真は大きめ
const NAMEBOX = 520;     // 料理名の領域（下揃え）。写真の真上に名前が来る
const INTRO = 42;
const STEP = 50;         // 1品ごとの間（ゆっくり）
const HOLD = 96;
const N = typoPhotos.length;
const TOTAL = INTRO + N * STEP + HOLD;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const OshinaTate: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [4, 20], [0, 1], clamp);
  const ruleW = interpolate(f, [12, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.ease) });
  const endA = INTRO + N * STEP;
  const sealO = interpolate(f, [endA, endA + 18], [0, 1], clamp);
  const sealS = interpolate(f, [endA, endA + 22], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const footO = interpolate(f, [endA + 10, endA + 28], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 16, TOTAL - 22, TOTAL], [0, 0.8, 0.8, 0], clamp)} />
      {/* 和紙の地＋外枠 */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 30% 18%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%), radial-gradient(60% 50% at 80% 90%, rgba(160,140,100,0.15), rgba(160,140,100,0) 60%)" }} />
      <div style={{ position: "absolute", top: 56, left: 56, right: 56, bottom: 56, border: "2px solid rgba(42,36,28,0.32)" }} />

      {/* 表題 */}
      <div style={{ position: "absolute", top: 110, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 62, letterSpacing: 16 }}>お品書き</div>
        <div style={{ width: (ruleW * 250) + "px", height: 2, backgroundColor: SEAL, margin: "18px auto 0" }} />
      </div>
      {/* 落款 */}
      <div style={{ position: "absolute", top: 144, right: 116, width: 66, height: 66, borderRadius: 8, border: "3px solid " + SEAL, color: SEAL, fontFamily: mincho, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", opacity: sealO, transform: "scale(" + sealS + ")" }}>旬</div>

      {/* 各品を「料理名（上・縦書き）＋写真（下）」の列にして右から並べる */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", flexDirection: "row-reverse", justifyContent: "center", alignItems: "flex-start" }}>
        {typoPhotos.map((p, i) => {
          const a = INTRO + i * STEP;
          const o = interpolate(f, [a, a + 16], [0, 1], clamp);
          const y = interpolate(f, [a, a + 18], [-20, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          const phO = interpolate(f, [a + 12, a + 30], [0, 1], clamp);
          const phS = interpolate(f, [a + 12, a + 32], [0.9, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const name = kanjiNum(p.caption);
          return (
            <div key={i} style={{ width: COL, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, transform: "translateY(" + y + "px)" }}>
              <span style={{ color: SEAL, fontFamily: mincho, fontSize: 26, marginBottom: 10 }}>{KAN[i] || (i + 1)}</span>
              {/* 料理名（下揃え＝写真のすぐ上に来る） */}
              <div style={{ height: NAMEBOX, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 50, letterSpacing: 6, writingMode: "vertical-rl" }}>{name}</span>
              </div>
              {/* 料理写真（名前の真下・大きめ） */}
              <div style={{ width: PHOTO, height: PHOTO, marginTop: 20, opacity: phO, transform: "scale(" + phS + ")" }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "6px solid #fff", boxShadow: "0 14px 30px rgba(0,0,0,0.26)" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 110, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontSize: 34, letterSpacing: 6, marginBottom: 10 }}>{storeName}</div>
        <div style={{ color: SUB, fontFamily: mincho, fontSize: 25, letterSpacing: 4 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
