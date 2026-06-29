import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const CREAM = "#f4ead4";
const GOLD = "#d8b25a";
const STRIP_W = 720;
const STRIP_L = (1080 - STRIP_W) / 2;   // 180
const FRAME_H = 470;
const WIN_W = 600;
const WIN_H = 366;
const SPEED = 3;
const DUR = 330;          // 約11秒
const N = Math.max(tempoPhotos.length, 1);
const LOOP = N * FRAME_H;
const HOLES = [0, 1, 2, 3, 4];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// フィルム：縦に流れるフィルムロール風。スプロケット穴付きのコマに料理が流れる（映画的）。
export const FilmStrip: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const introO = interpolate(f, [0, 12, 46, 60], [0, 1, 1, 0], clamp);
  const topO = interpolate(f, [50, 66], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 56, DUR - 42], [0, 1], clamp);
  const shiftY = -((SPEED * f) % LOOP);
  const reps = [0, 1, 2];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0907" }}>
      <Audio src={staticFile(tempoMusic)} volume={(ff) => interpolate(ff, [0, 15, DUR - 22, DUR], [0, 0.88, 0.88, 0], clamp)} />

      {/* フィルム帯（中央） */}
      <div style={{ position: "absolute", left: STRIP_L, top: 0, width: STRIP_W, height: "100%", overflow: "hidden", background: "#14110c" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", transform: "translateY(" + shiftY + "px)" }}>
          {reps.map((r) => tempoPhotos.map((p, i) => {
            const fs = oneLineFont(p.caption, WIN_W - 60, 34, 2, 22);
            return (
              <div key={r + "-" + i} style={{ position: "relative", width: "100%", height: FRAME_H }}>
                {/* スプロケット穴（左右） */}
                {HOLES.map((h) => (
                  <div key={"l" + h} style={{ position: "absolute", left: 24, top: 40 + h * ((FRAME_H - 80) / 4) - 17, width: 34, height: 26, background: "#0a0907", borderRadius: 6 }} />
                ))}
                {HOLES.map((h) => (
                  <div key={"r" + h} style={{ position: "absolute", right: 24, top: 40 + h * ((FRAME_H - 80) / 4) - 17, width: 34, height: 26, background: "#0a0907", borderRadius: 6 }} />
                ))}
                {/* コマ */}
                <div style={{ position: "absolute", left: (STRIP_W - WIN_W) / 2, top: (FRAME_H - WIN_H) / 2, width: WIN_W, height: WIN_H, overflow: "hidden", background: "#000", border: "2px solid #2a2218" }}>
                  <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", padding: "26px 16px 12px", textAlign: "center", background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))" }}>
                    <span style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: fs, letterSpacing: 2, whiteSpace: "nowrap" }}>{p.caption}</span>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* レターボックス上下 */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 150, background: "#080705", opacity: topO, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 22, letterSpacing: 14, marginBottom: 6 }}>FILM No.03</div>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 46, letterSpacing: 14 }}>本日の一巻</div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 210, background: "#080705", opacity: footO, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 32, letterSpacing: 6 }}>{storeName}</div>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 26, letterSpacing: 4, marginTop: 8 }}>{handle}</div>
      </div>

      {/* オープニング */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(8,7,5,0.92)", opacity: introO }}>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 26, letterSpacing: 16, marginBottom: 20 }}>― すさび すし酒場 ―</div>
        <div style={{ color: CREAM, fontFamily: mincho, fontWeight: 700, fontSize: 78, letterSpacing: 10 }}>本日の一巻</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const FILMSTRIP_DUR = DUR;
