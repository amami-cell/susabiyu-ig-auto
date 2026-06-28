import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { kaitenPhotos, kaitenMusic } from "./kaitenData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const RED = "#c0392b";
const GOLD = "#9c6b1f";
const INK = "#3a2716";
const CREAM = "#fff6e6";
const PLATE = 420;       // 1皿のスロット幅
const SPEED = 6;         // 流れる速さ(px/frame)
const DUR = 360;         // 約12秒
const N = Math.max(kaitenPhotos.length, 1);
const LOOP = N * PLATE;
const PLATE_IMG = 300;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 回転レーン風（寿司限定・賑やか）：寿司の皿が右から左へ流れる。明るい縁日カラー。
export const KaitenStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const introO = interpolate(f, [0, 12, 50, 64], [0, 1, 1, 0], clamp);
  const footO = interpolate(f, [DUR - 60, DUR - 46], [0, 1], clamp);
  const shiftX = -((SPEED * f) % LOOP);
  const reps = [0, 1, 2];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#ffd98a 0%,#f6b65a 48%,#ef9a45 100%)" }}>
      <Audio src={staticFile(kaitenMusic)} volume={(ff) => interpolate(ff, [0, 15, DUR - 22, DUR], [0, 0.9, 0.9, 0], clamp)} />

      {/* 提灯ふうの飾り（賑やかさ） */}
      <div style={{ position: "absolute", top: 70, left: 0, width: "100%", display: "flex", justifyContent: "space-around", padding: "0 30px" }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ width: 64, height: 80, borderRadius: "46%", background: i % 2 ? CREAM : RED, border: "4px solid " + (i % 2 ? RED : GOLD), boxShadow: "0 6px 14px rgba(0,0,0,0.18)" }} />
        ))}
      </div>

      {/* 見出し */}
      <div style={{ position: "absolute", top: 220, left: 0, width: "100%", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: RED, color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 38, letterSpacing: 10, padding: "12px 36px", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}>本日の鮮魚</div>
        <div style={{ color: INK, fontFamily: mincho, fontWeight: 700, fontSize: 50, letterSpacing: 6, marginTop: 22 }}>{storeName}</div>
      </div>

      {/* レーン帯（木目調） */}
      <div style={{ position: "absolute", top: 770, left: 0, width: "100%", height: 470, background: "linear-gradient(180deg,#b9763c,#8a5328)", borderTop: "5px solid " + GOLD, borderBottom: "5px solid " + GOLD, boxShadow: "inset 0 0 60px rgba(0,0,0,0.25)" }} />

      {/* 流れる寿司皿 */}
      <div style={{ position: "absolute", top: 805, left: 0, height: 400, width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", display: "flex", transform: "translateX(" + shiftX + "px)" }}>
          {reps.map((r) => kaitenPhotos.map((p, i) => {
            const fs = oneLineFont(p.caption, PLATE_IMG, 32, 2, 22);
            return (
              <div key={r + "-" + i} style={{ width: PLATE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: PLATE_IMG + 26, height: PLATE_IMG + 26, borderRadius: "50%", background: "radial-gradient(circle at 50% 36%, #ffffff, #e9ddc6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 30px rgba(60,30,10,0.35)" }}>
                  <div style={{ width: PLATE_IMG, height: PLATE_IMG, borderRadius: "50%", overflow: "hidden", border: "4px solid " + RED }}>
                    <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
                <div style={{ marginTop: 20, color: INK, fontFamily: mincho, fontWeight: 700, fontSize: fs, letterSpacing: 2, whiteSpace: "nowrap", background: "rgba(255,246,230,0.85)", padding: "4px 16px", borderRadius: 999 }}>{p.caption}</div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* オープニング：本日の鮮魚。 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(192,57,43,0.86)", opacity: introO }}>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 88, letterSpacing: 12 }}>本日の鮮魚。</div>
        <div style={{ width: 200, height: 4, backgroundColor: CREAM, marginTop: 30, opacity: 0.9 }} />
      </AbsoluteFill>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 150, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontWeight: 700, fontSize: 34, letterSpacing: 6, marginBottom: 8 }}>{storeName}</div>
        <div style={{ color: RED, fontFamily: mincho, fontSize: 26, letterSpacing: 4 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const KAITEN_DUR = DUR;
