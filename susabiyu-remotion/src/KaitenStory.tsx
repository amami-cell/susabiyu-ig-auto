import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#14110d";
const LANE = "#23201a";
const GOLD = "#d8b25a";
const WHITE = "#f6f1e7";
const PLATE = 420;       // 1皿のスロット幅
const SPEED = 6;         // 流れる速さ(px/frame)
const DUR = 360;         // 約12秒
const N = Math.max(tempoPhotos.length, 1);
const LOOP = N * PLATE;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 回転レーン風：料理の皿が右から左へ流れていく（回転寿司のイメージ）。
export const KaitenStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const introO = interpolate(f, [0, 12, 46, 58], [0, 1, 1, 0], clamp);
  const footO = interpolate(f, [DUR - 60, DUR - 46], [0, 1], clamp);
  const shiftX = -((SPEED * f) % LOOP);
  // レーンを途切れさせないため3周ぶん並べる
  const reps = [0, 1, 2];
  const PLATE_IMG = 300;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(tempoMusic)} volume={(ff) => interpolate(ff, [0, 15, DUR - 22, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 上の見出し */}
      <div style={{ position: "absolute", top: 150, left: 0, width: "100%", textAlign: "center" }}>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 30, letterSpacing: 12, marginBottom: 12 }}>本日も、旬が回ります</div>
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 60, letterSpacing: 8 }}>{storeName}</div>
      </div>

      {/* レーン帯 */}
      <div style={{ position: "absolute", top: 760, left: 0, width: "100%", height: 470, background: "linear-gradient(180deg," + LANE + ",#191510)", borderTop: "3px solid " + GOLD, borderBottom: "3px solid " + GOLD }} />

      {/* 流れる皿 */}
      <div style={{ position: "absolute", top: 800, left: 0, height: 400, width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", display: "flex", transform: "translateX(" + shiftX + "px)" }}>
          {reps.map((r) => tempoPhotos.map((p, i) => {
            const fs = oneLineFont(p.caption, PLATE_IMG, 32, 2, 22);
            return (
              <div key={r + "-" + i} style={{ width: PLATE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {/* 皿 */}
                <div style={{ width: PLATE_IMG + 24, height: PLATE_IMG + 24, borderRadius: "50%", background: "radial-gradient(circle at 50% 38%, #3a342b, #1a1712)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 30px rgba(0,0,0,0.45)" }}>
                  <div style={{ width: PLATE_IMG, height: PLATE_IMG, borderRadius: "50%", overflow: "hidden", border: "4px solid #fff" }}>
                    <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
                <div style={{ marginTop: 22, color: WHITE, fontFamily: mincho, fontWeight: 600, fontSize: fs, letterSpacing: 2, whiteSpace: "nowrap" }}>{p.caption}</div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* 導入オーバーレイ */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(10,8,6,0.72)", opacity: introO }}>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 34, letterSpacing: 16, marginBottom: 18 }}>回転レーン</div>
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 72, letterSpacing: 10 }}>本日のネタ</div>
      </AbsoluteFill>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 150, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontSize: 32, letterSpacing: 6, marginBottom: 8 }}>{storeName}</div>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 26, letterSpacing: 4 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const KAITEN_DUR = DUR;
