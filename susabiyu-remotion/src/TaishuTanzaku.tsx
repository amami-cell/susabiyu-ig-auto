// 大衆・壁の短冊：烏丸「お品書き(縦書き)」(OshinaTate)のコマ送り構成そのままに、
// 和紙の誌面 → 居酒屋の木壁に短冊メニュー札がパタパタ貼られていく見せ方へ。
// 提灯・祭りの道具は使わない（木壁×短冊で世界観を分ける）。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { typoPhotos, typoUptempo } from "./typoData";
import { kanjiNum } from "./fit";
import { AKA, KURO, SHIRO, Tex, Spot, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const GAP = 22;
const PAD = 74;
const GRID_TOP = 236;
const GRID_BOTTOM = 1664;
const COLS = 2;
const INTRO = 40;
const STEP = 40;
const HOLD = 90;
const N = typoPhotos.length;
const ROWS = Math.max(1, Math.ceil(N / COLS));
const CW = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CH = (GRID_BOTTOM - GRID_TOP - GAP * (ROWS - 1)) / ROWS;
export const TTAN_DUR = INTRO + N * STEP + HOLD;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 居酒屋の木壁（板目＋灯り）
const KabeBg: React.FC = () => (
  <AbsoluteFill style={{ background: "repeating-linear-gradient(180deg, #5d3c22 0 4px, #4e3019 4px 176px, #3f2612 176px 180px)" }}>
    <Tex opacity={0.2} blend="multiply" />
    <Spot x="50%" y="-4%" color="255,200,130" opacity={0.26} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,4,0.4) 100%)" }} />
  </AbsoluteFill>
);

export const TaishuTanzaku: React.FC<{ storeName?: string; handle?: string; region?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo", region = "京都・河原町三条" }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [4, 18], [0, 1], clamp);
  const titleS = interpolate(f, [4, 14], [1.7, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sealS = interpolate(f, [14, 19], [2.4, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const sealO = f >= 14 ? 1 : 0;
  const footO = interpolate(f, [10, 26], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#4e3019" }}>
      <Audio src={staticFile(typoUptempo)} volume={(ff) => interpolate(ff, [0, 16, TTAN_DUR - 22, TTAN_DUR], [0, 0.85, 0.85, 0], clamp)} />
      <KabeBg />

      {/* 表題：白木の看板 */}
      <div style={{ position: "absolute", top: 84, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ display: "inline-block", background: "linear-gradient(180deg,#efe3c8,#e0cda4)", border: "4px solid #3a2412",
          borderRadius: 8, padding: "14px 60px", transform: "rotate(-1deg) scale(" + titleS + ")", boxShadow: "0 10px 26px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#3a2412", fontFamily: fude, fontSize: 58, letterSpacing: 8 }}>本日のおしながき</span>
        </div>
      </div>
      {/* 旨の赤ハンコがドン */}
      <div style={{ position: "absolute", top: 96, right: 84, transform: "rotate(9deg) scale(" + sealS + ")", opacity: sealO }}>
        <div style={{ width: 104, height: 104, borderRadius: "50%", border: "6px solid " + AKA, background: "rgba(250,242,226,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
          <span style={{ color: AKA, fontFamily: fude, fontSize: 56 }}>旨</span>
        </div>
      </div>

      {/* コマ：写真札（白木フチ）＋縦書き短冊がパタッと貼られる */}
      {typoPhotos.map((p, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + (COLS - 1 - col) * (CW + GAP);
        const y = GRID_TOP + row * (CH + GAP);
        const a = INTRO + i * STEP;
        const o = interpolate(f, [a, a + 10], [0, 1], clamp);
        const s = interpolate(f, [a, a + 12], [1.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const deg = i % 2 === 0 ? -2 : 2;
        const name = kanjiNum(p.caption);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: CW, height: CH, opacity: o,
            transform: "scale(" + s + ") rotate(" + deg + "deg)" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", border: "7px solid #efe3c8",
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)", backgroundColor: "#000" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.12) contrast(1.04)" }} />
            </div>
            {/* 釘留めの短冊（縦書き） */}
            <div style={{ position: "absolute", top: -14, right: 10, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "18px 12px 20px", background: "linear-gradient(180deg,#f6eeda,#eaddbd)", border: "3px solid #3a2412", borderRadius: 4,
              boxShadow: "4px 6px 14px rgba(0,0,0,0.45)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2c1c0c", marginBottom: 10, boxShadow: "inset 0 2px 3px rgba(255,255,255,0.4)" }} />
              <span style={{ color: AKA, fontFamily: fude, fontSize: 24, marginBottom: 8 }}>{KAN[i] || (i + 1)}</span>
              <span style={{ color: "#2c1c0c", fontFamily: fude, fontSize: 40, letterSpacing: 3, writingMode: "vertical-rl" } as React.CSSProperties}>{name}</span>
            </div>
          </div>
        );
      })}

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 78, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: SHIRO, fontFamily: fude, fontSize: 40, letterSpacing: 4, marginBottom: 10, ...fuchi(KURO, 5) }}>{storeName}</div>
        <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 26, letterSpacing: 2, ...fuchi(KURO, 4) }}>{region}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
