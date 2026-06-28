import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { kaitenPhotos, kaitenMusic } from "./kaitenData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const TEAL_A = "#62c2bb";
const TEAL_B = "#4fb0a9";
const RED = "#c0392b";
const GOLD = "#9c6b1f";
const INK = "#243b39";
const CREAM = "#fff7e9";
const PLATE = 420;       // 1皿のスロット幅
const SPEED = 6;         // 流れる速さ(px/frame)
const DUR = 360;         // 約12秒
const N = Math.max(kaitenPhotos.length, 1);
const LOOP = N * PLATE;
const PLATE_IMG = 300;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 背景の寿司柄（CSSで描画＝フォント非依存で崩れない）
const NETA = ["#f0875a", "#d65a5a", "#efc24a", "#f2a3a3", "#e8632c", "#e9a05a"];
type Tile = { x: number; y: number; rot: number; type: "nigiri" | "maki"; color: string };
const SUSHI_TILES: Tile[] = (() => {
  const t: Tile[] = []; const cols = 5, rows = 9;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const jx = ((i * 53) % 64) - 32, jy = ((i * 29) % 54) - 27;
    t.push({ x: c * 224 + 26 + jx, y: r * 222 - 24 + jy, rot: ((i * 47) % 46) - 23, type: i % 3 === 0 ? "maki" : "nigiri", color: NETA[i % NETA.length] });
  }
  return t;
})();

const Nigiri: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ position: "relative", width: 122, height: 74 }}>
    <div style={{ position: "absolute", left: 0, bottom: 0, width: 122, height: 54, borderRadius: 27, background: "#fbf7ee", boxShadow: "0 4px 8px rgba(0,0,0,.12)" }} />
    <div style={{ position: "absolute", left: 3, top: 0, width: 116, height: 42, borderRadius: 22, background: color, boxShadow: "inset 0 6px 8px rgba(255,255,255,.25)" }} />
  </div>
);
const Maki: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 86, height: 86, borderRadius: "50%", background: "#2b2b2b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 8px rgba(0,0,0,.14)" }}>
    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fbf7ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: color }} />
    </div>
  </div>
);

// 回転レーン風（寿司限定）：ティール地に寿司柄、寿司の皿が右から左へ流れる。
export const KaitenStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const introO = interpolate(f, [0, 12, 50, 64], [0, 1, 1, 0], clamp);
  const footO = interpolate(f, [DUR - 60, DUR - 46], [0, 1], clamp);
  const shiftX = -((SPEED * f) % LOOP);
  const reps = [0, 1, 2];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg," + TEAL_A + "," + TEAL_B + ")" }}>
      <Audio src={staticFile(kaitenMusic)} volume={(ff) => interpolate(ff, [0, 15, DUR - 22, DUR], [0, 0.9, 0.9, 0], clamp)} />

      {/* 背景：寿司柄（散らし） */}
      <AbsoluteFill style={{ opacity: 0.9 }}>
        {SUSHI_TILES.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, transform: "rotate(" + s.rot + "deg)" }}>
            {s.type === "maki" ? <Maki color={s.color} /> : <Nigiri color={s.color} />}
          </div>
        ))}
      </AbsoluteFill>

      {/* 見出し */}
      <div style={{ position: "absolute", top: 210, left: 0, width: "100%", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: RED, color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 40, letterSpacing: 10, padding: "13px 38px", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.22)" }}>本日の鮮魚</div>
        <div style={{ display: "inline-block", marginTop: 20, color: INK, fontFamily: mincho, fontWeight: 700, fontSize: 46, letterSpacing: 6, background: "rgba(255,247,233,0.9)", padding: "8px 28px", borderRadius: 999 }}>{storeName}</div>
      </div>

      {/* レーン帯（木目調） */}
      <div style={{ position: "absolute", top: 778, left: 0, width: "100%", height: 470, background: "linear-gradient(180deg,#b9763c,#8a5328)", borderTop: "5px solid " + GOLD, borderBottom: "5px solid " + GOLD, boxShadow: "inset 0 0 60px rgba(0,0,0,0.25)" }} />

      {/* 流れる寿司皿 */}
      <div style={{ position: "absolute", top: 812, left: 0, height: 400, width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", display: "flex", transform: "translateX(" + shiftX + "px)" }}>
          {reps.map((r) => kaitenPhotos.map((p, i) => {
            const fs = oneLineFont(p.caption, PLATE_IMG, 32, 2, 22);
            return (
              <div key={r + "-" + i} style={{ width: PLATE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: PLATE_IMG + 26, height: PLATE_IMG + 26, borderRadius: "50%", background: "radial-gradient(circle at 50% 36%, #ffffff, #e9ddc6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 30px rgba(20,40,38,0.4)" }}>
                  <div style={{ width: PLATE_IMG, height: PLATE_IMG, borderRadius: "50%", overflow: "hidden", border: "4px solid " + RED }}>
                    <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
                <div style={{ marginTop: 20, color: INK, fontFamily: mincho, fontWeight: 700, fontSize: fs, letterSpacing: 2, whiteSpace: "nowrap", background: "rgba(255,247,233,0.92)", padding: "4px 16px", borderRadius: 999 }}>{p.caption}</div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* オープニング：本日の鮮魚。 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(192,57,43,0.88)", opacity: introO }}>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 88, letterSpacing: 12 }}>本日の鮮魚。</div>
        <div style={{ width: 200, height: 4, backgroundColor: CREAM, marginTop: 30, opacity: 0.9 }} />
      </AbsoluteFill>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 150, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ display: "inline-block", color: INK, fontFamily: mincho, fontWeight: 700, fontSize: 34, letterSpacing: 6, background: "rgba(255,247,233,0.92)", padding: "10px 30px", borderRadius: 999 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const KAITEN_DUR = DUR;
