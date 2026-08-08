import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { kanjiNum } from "./fit";

const { fontFamily: mincho } = loadFont();
const PAPER = "#efe7d6";
const INK = "#2a241c";
const SEAL = "#b4402f";
const GOLD = "#d8b25a";
const SUB = "#8a7e6c";

// お品書き(四コマ風)。写真を大きく2×2グリッドで見せ、各コマに縦書きの料理名を載せる。
const GAP = 22;
const PAD = 74;
const GRID_TOP = 236;
const GRID_BOTTOM = 1664;     // この下に屋号
const COLS = 2;
const INTRO = 40;
const STEP = 40;              // 1コマずつ出る間隔
const HOLD = 90;
const N = typoPhotos.length;
const ROWS = Math.max(1, Math.ceil(N / COLS));
const CW = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CH = (GRID_BOTTOM - GRID_TOP - GAP * (ROWS - 1)) / ROWS;
const TOTAL = INTRO + N * STEP + HOLD;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const OshinaTate: React.FC<{ storeName?: string; handle?: string; region?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo", region = "京都・河原町三条" }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [4, 20], [0, 1], clamp);
  const ruleW = interpolate(f, [12, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.ease) });
  const sealO = interpolate(f, [8, 24], [0, 1], clamp);
  const footO = interpolate(f, [10, 26], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 16, TOTAL - 22, TOTAL], [0, 0.8, 0.8, 0], clamp)} />
      {/* 和紙の地＋外枠 */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 30% 18%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%), radial-gradient(60% 50% at 80% 90%, rgba(160,140,100,0.15), rgba(160,140,100,0) 60%)" }} />
      <div style={{ position: "absolute", top: 52, left: 52, right: 52, bottom: 52, border: "2px solid rgba(42,36,28,0.3)" }} />

      {/* 表題 */}
      <div style={{ position: "absolute", top: 96, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 60, letterSpacing: 16 }}>お品書き</div>
        <div style={{ width: (ruleW * 240) + "px", height: 2, backgroundColor: SEAL, margin: "16px auto 0" }} />
      </div>
      {/* 落款 */}
      <div style={{ position: "absolute", top: 128, right: 104, width: 62, height: 62, borderRadius: 8, border: "3px solid " + SEAL, color: SEAL, fontFamily: mincho, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", opacity: sealO }}>旬</div>

      {/* 四コマ：大きな写真＋縦書きの料理名（右上→左、上→下の順） */}
      {typoPhotos.map((p, i) => {
        const col = i % COLS;            // 右から（一を右上に）
        const row = Math.floor(i / COLS);
        const x = PAD + (COLS - 1 - col) * (CW + GAP);
        const y = GRID_TOP + row * (CH + GAP);
        const a = INTRO + i * STEP;
        const o = interpolate(f, [a, a + 16], [0, 1], clamp);
        const s = interpolate(f, [a, a + 20], [0.93, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const name = kanjiNum(p.caption);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: CW, height: CH, opacity: o, transform: "scale(" + s + ")", borderRadius: 14, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 16px 36px rgba(0,0,0,0.28)", backgroundColor: "#000" }}>
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* 縦書きの名札（写真の上に） */}
            <div style={{ position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 12px", borderRadius: 10, background: "rgba(20,16,12,0.5)" }}>
              <span style={{ color: GOLD, fontFamily: mincho, fontSize: 26, marginBottom: 10 }}>{KAN[i] || (i + 1)}</span>
              <span style={{ color: "#fff", fontFamily: mincho, fontWeight: 600, fontSize: 40, letterSpacing: 4, writingMode: "vertical-rl", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{name}</span>
            </div>
          </div>
        );
      })}

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 96, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontSize: 32, letterSpacing: 6, marginBottom: 8 }}>{storeName}</div>
        <div style={{ color: SUB, fontFamily: mincho, fontSize: 24, letterSpacing: 4 }}>{region}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
