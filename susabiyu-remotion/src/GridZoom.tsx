import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#0c0a08";
const GOLD = "#d8b25a";
const WHITE = "#f6f1e7";
const PAD = 40;
const GAP = 16;
const COLS = 2;
const GP = 132;          // グリッドを見せる長さ
const DUR = 312;         // 約10秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// グリッド→主役ズーム：複数写真のモザイクを見せてから、1枚にズームして主役紹介。
export const GridZoom: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const photos = tempoPhotos.slice(0, 6);
  const n = Math.max(photos.length, 1);
  const rows = Math.ceil(n / COLS);
  const cw = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const ch = (1920 - PAD * 2 - GAP * (rows - 1)) / rows;
  const hero = photos[0] || { src: "", caption: "" };

  const gridO = interpolate(f, [GP - 16, GP], [1, 0], clamp);       // グリッドはズーム開始で消える
  const heroO = interpolate(f, [GP - 10, GP + 8], [0, 1], clamp);
  const heroScale = interpolate(f, [GP, DUR], [1.05, 1.18], clamp);
  const nameO = interpolate(f, [GP + 14, GP + 32], [0, 1], clamp);
  const nameY = interpolate(f, [GP + 14, GP + 34], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const labO = interpolate(f, [10, 24], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 840, 84, 4, 46);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(tempoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* グリッド（モザイク） */}
      <AbsoluteFill style={{ opacity: gridO }}>
        {photos.map((p, i) => {
          const col = i % COLS, row = Math.floor(i / COLS);
          const x = PAD + col * (cw + GAP);
          const y = PAD + row * (ch + GAP);
          const a = i * 8;
          const o = interpolate(f, [a, a + 14], [0, 1], clamp);
          const s = interpolate(f, [a, a + 16], [0.94, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: cw, height: ch, opacity: o, transform: "scale(" + s + ")", overflow: "hidden", borderRadius: 8, border: "4px solid #fff", boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", top: 70, left: 0, width: "100%", textAlign: "center", opacity: labO }}>
          <span style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 40, letterSpacing: 10, background: "rgba(12,10,8,0.6)", padding: "10px 28px", borderRadius: 8 }}>本日の品々</span>
        </div>
      </AbsoluteFill>

      {/* 主役ズーム */}
      <AbsoluteFill style={{ opacity: heroO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + heroScale + ")" }} />
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.85) 100%)" }} />
        <div style={{ position: "absolute", top: 130, left: 80, opacity: nameO, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 30, height: 2, backgroundColor: GOLD }} />
          <span style={{ color: GOLD, fontFamily: mincho, fontSize: 28, letterSpacing: 10 }}>本日の一番</span>
        </div>
        <div style={{ position: "absolute", bottom: 250, left: 80, right: 80, opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
          <div style={{ width: 110, height: 5, backgroundColor: GOLD, marginBottom: 22 }} />
          <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: nm, letterSpacing: 4, whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>{hero.caption}</div>
        </div>
      </AbsoluteFill>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 110, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontSize: 28, letterSpacing: 5 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const GRIDZOOM_DUR = DUR;
