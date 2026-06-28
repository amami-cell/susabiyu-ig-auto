import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";

const { fontFamily: mincho } = loadFont();
const PAPER = "#efe7d6";
const INK = "#2a241c";
const SEAL = "#b4402f";
const SUB = "#8a7e6c";

// 縦書きのお品書き。料理名を右から縦書きで並べ、その料理写真を下段に並べる。
const SLOT = 210;
const INTRO = 42;
const STEP = 50;      // 1品ごとの間（ゆっくり）
const HOLD = 96;
const N = typoPhotos.length;
const TOTAL = INTRO + N * STEP + HOLD;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const OshinaTate: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [4, 20], [0, 1], clamp);
  const ruleW = interpolate(f, [12, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.ease) });
  const sealO = interpolate(f, [INTRO + N * STEP, INTRO + N * STEP + 18], [0, 1], clamp);
  const sealS = interpolate(f, [INTRO + N * STEP, INTRO + N * STEP + 22], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const footO = interpolate(f, [INTRO + N * STEP + 10, INTRO + N * STEP + 28], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 16, TOTAL - 22, TOTAL], [0, 0.8, 0.8, 0], clamp)} />
      {/* 和紙の地＋外枠 */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 30% 18%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%), radial-gradient(60% 50% at 80% 90%, rgba(160,140,100,0.15), rgba(160,140,100,0) 60%)" }} />
      <div style={{ position: "absolute", top: 56, left: 56, right: 56, bottom: 56, border: "2px solid rgba(42,36,28,0.32)" }} />

      {/* 表題 */}
      <div style={{ position: "absolute", top: 116, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 64, letterSpacing: 16 }}>お品書き</div>
        <div style={{ width: (ruleW * 260) + "px", height: 2, backgroundColor: SEAL, margin: "20px auto 0" }} />
      </div>
      {/* 落款 */}
      <div style={{ position: "absolute", top: 150, right: 120, width: 70, height: 70, borderRadius: 8, border: "3px solid " + SEAL, color: SEAL, fontFamily: mincho, fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", opacity: sealO, transform: "scale(" + sealS + ")" }}>旬</div>

      {/* 料理名（縦書き・右から左へ） */}
      <div style={{ position: "absolute", top: 340, left: 0, right: 0, height: 780, display: "flex", flexDirection: "row-reverse", justifyContent: "center", alignItems: "flex-start" }}>
        {typoPhotos.map((p, i) => {
          const a = INTRO + i * STEP;
          const o = interpolate(f, [a, a + 16], [0, 1], clamp);
          const y = interpolate(f, [a, a + 18], [-22, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ width: SLOT, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, transform: "translateY(" + y + "px)" }}>
              <span style={{ color: SEAL, fontFamily: mincho, fontSize: 26, marginBottom: 14 }}>{KAN[i] || (i + 1)}</span>
              <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 52, letterSpacing: 6, writingMode: "vertical-rl" }}>{p.caption}</span>
            </div>
          );
        })}
      </div>

      {/* 料理写真（下段に横並び。料理名と同じ並び＝対応がわかる） */}
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, height: 210, display: "flex", flexDirection: "row-reverse", justifyContent: "center", alignItems: "center" }}>
        {typoPhotos.map((p, i) => {
          const a = INTRO + i * STEP + 12;
          const o = interpolate(f, [a, a + 18], [0, 1], clamp);
          const s = interpolate(f, [a, a + 20], [0.9, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ width: SLOT, display: "flex", justifyContent: "center", opacity: o, transform: "scale(" + s + ")" }}>
              <div style={{ width: 188, height: 188 }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "6px solid #fff", boxShadow: "0 12px 28px rgba(0,0,0,0.24)" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 116, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontSize: 34, letterSpacing: 6, marginBottom: 10 }}>{storeName}</div>
        <div style={{ color: SUB, fontFamily: mincho, fontSize: 25, letterSpacing: 4 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
