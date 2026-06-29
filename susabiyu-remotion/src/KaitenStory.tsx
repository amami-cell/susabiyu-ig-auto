import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { kaitenPhotos, kaitenMusic } from "./kaitenData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#17110c";
const RED = "#c0392b";
const GOLD = "#d8b25a";
const CREAM = "#fff7e9";
const INK = "#2a1d10";
const PLATE = 470;       // 1皿のスロット幅
const SPEED = 6;         // 流れる速さ(px/frame)
const DUR = 360;         // 約12秒
const N = Math.max(kaitenPhotos.length, 1);
const LOOP = N * PLATE;
const PLATE_IMG = 348;   // 丸皿の写真サイズ（大きめ）
const HERO_H = 1040;     // 上の板前写真の高さ
const LANE_TOP = 1086;
const LANE_H = 560;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 回転レーン風（寿司限定）：上に板前さんの寿司盛り合わせ写真、その下に寿司の皿が流れる。
export const KaitenStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const introO = interpolate(f, [0, 12, 48, 62], [0, 1, 1, 0], clamp);
  const heroScale = interpolate(f, [0, DUR], [1.05, 1.12], clamp);
  const titleO = interpolate(f, [56, 72], [0, 1], clamp);
  const titleY = interpolate(f, [56, 74], [28, 0], clamp);
  const footO = interpolate(f, [DUR - 60, DUR - 46], [0, 1], clamp);
  const shiftX = -((SPEED * f) % LOOP);
  const reps = [0, 1, 2];
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(kaitenMusic)} volume={(ff) => interpolate(ff, [0, 15, DUR - 22, DUR], [0, 0.9, 0.9, 0], clamp)} />

      {/* 上：板前さんの寿司盛り合わせ写真（アップ＝cover。盛りが中央に来るよう横位置を調整） */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: HERO_H, overflow: "hidden", backgroundColor: "#0e0a06" }}>
        <Img src={staticFile("itamae.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "66% 40%", transform: "scale(" + heroScale + ")" }} />
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 60%, rgba(20,12,6,0.92) 100%)" }} />
        {/* 見出し */}
        <div style={{ position: "absolute", bottom: 46, left: 0, width: "100%", textAlign: "center", opacity: titleO, transform: "translateY(" + titleY + "px)" }}>
          <div style={{ display: "inline-block", background: RED, color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 42, letterSpacing: 12, padding: "13px 40px", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>本日の鮮魚</div>
          <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 50, letterSpacing: 6, marginTop: 18, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>{storeName}</div>
        </div>
      </div>

      {/* レーン帯（木目調） */}
      <div style={{ position: "absolute", top: LANE_TOP, left: 0, width: "100%", height: LANE_H, background: "linear-gradient(180deg,#b9763c,#8a5328)", borderTop: "5px solid " + GOLD, borderBottom: "5px solid " + GOLD, boxShadow: "inset 0 0 60px rgba(0,0,0,0.3)" }} />

      {/* 流れる寿司皿 */}
      <div style={{ position: "absolute", top: LANE_TOP + 34, left: 0, height: LANE_H - 60, width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", display: "flex", alignItems: "center", transform: "translateX(" + shiftX + "px)" }}>
          {reps.map((r) => kaitenPhotos.map((p, i) => {
            const fs = oneLineFont(p.caption, PLATE_IMG, 36, 2, 24);
            return (
              <div key={r + "-" + i} style={{ width: PLATE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: PLATE_IMG + 24, height: PLATE_IMG + 24, borderRadius: "50%", background: "radial-gradient(circle at 50% 36%, #ffffff, #e9ddc6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 26px rgba(0,0,0,0.4)" }}>
                  <div style={{ width: PLATE_IMG, height: PLATE_IMG, borderRadius: "50%", overflow: "hidden", border: "4px solid " + RED }}>
                    <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
                <div style={{ marginTop: 14, color: INK, fontFamily: mincho, fontWeight: 700, fontSize: fs, letterSpacing: 2, whiteSpace: "nowrap", background: "rgba(255,247,233,0.92)", padding: "3px 14px", borderRadius: 999 }}>{p.caption}</div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* オープニング：本日の鮮魚。 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(192,57,43,0.9)", opacity: introO }}>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 90, letterSpacing: 12 }}>本日の鮮魚。</div>
        <div style={{ width: 200, height: 4, backgroundColor: CREAM, marginTop: 30, opacity: 0.9 }} />
      </AbsoluteFill>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 96, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 32, letterSpacing: 6 }}>{storeName}　{handle}</div>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 24, letterSpacing: 4, marginTop: 6 }}>京都・河原町三条</div>
      </div>
    </AbsoluteFill>
  );
};

export const KAITEN_DUR = DUR;
