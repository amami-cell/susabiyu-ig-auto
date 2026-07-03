// 大衆④「回転レーン・大衆版」：赤いカウンターの上を皿（料理写真）が
// 列になって流れ続ける。品名札つき。ワイワイした食堂の空気。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { Cine } from "./cine";
import { AKA, AKA_DARK, KIIRO, SHIRO, KURO, tpick, taishuMusic, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
export const TKAI_DUR = 250;
const PHOTOS = tpick(6);
const CARD_W = 560;                     // 皿1枚の幅（間隔）
const SPEED = 7;                        // px/フレーム

// 1レーンぶん：皿が右→左へ流れ続ける（巡回）
const Lane: React.FC<{ y: number; offset: number; size: number }> = ({ y, offset, size }) => {
  const f = useCurrentFrame();
  const total = PHOTOS.length * CARD_W;
  return (
    <div style={{ position: "absolute", top: y, left: 0, width: 1080, height: size + 120 }}>
      {PHOTOS.map((p, i) => {
        const x0 = ((i * CARD_W - f * SPEED - offset) % total + total) % total;
        const left = x0 - CARD_W;   // -CARD_W〜total-CARD_W を巡回＝右から入って左へ抜ける
        return (
          <div key={i} style={{ position: "absolute", left, top: 0, width: size }}>
            <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: "10px solid " + SHIRO,
              boxShadow: "0 16px 36px rgba(0,0,0,0.5)" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <span style={{ background: KIIRO, border: "4px solid " + KURO, borderRadius: 8, padding: "6px 16px",
                color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 34, whiteSpace: "nowrap" }}>{p.caption}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const TaishuKaiten: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const tS = interpolate(f, [4, 12], [2.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tO = interpolate(f, [4, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endO = interpolate(f, [TKAI_DUR - 10, TKAI_DUR], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: KURO, opacity: endO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TKAI_DUR - 18, TKAI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.1) saturate(1.28) brightness(1.03)">
        {/* 背景＝赤い暖簾＋木のカウンター帯 */}
        <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, " + AKA + " 0 216px, " + AKA_DARK + " 216px 220px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, height: 560, background: "linear-gradient(180deg,#6b4326,#4a2c17)", boxShadow: "0 -8px 30px rgba(0,0,0,0.4)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1210, height: 560, background: "linear-gradient(180deg,#5d3920,#3d2412)", boxShadow: "0 -8px 30px rgba(0,0,0,0.4)" }} />
        {/* タイトル */}
        <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", opacity: tO, transform: "scale(" + tS + ")" }}>
          <span style={{ color: SHIRO, fontFamily: fude, fontSize: 96, ...fuchi(KURO, 7) }}>ぞくぞく登場！</span>
        </div>
        {/* 2レーン：上は速く、下はゆっくり逆位相 */}
        <Lane y={620} offset={0} size={400} />
        <Lane y={1270} offset={280} size={400} />
        <div style={{ position: "absolute", bottom: 46, width: "100%", textAlign: "center" }}>
          <span style={{ color: SHIRO, fontFamily: goshi, fontSize: 34, ...fuchi(KURO, 4) }}>{handle}</span>
        </div>
      </Cine>
    </AbsoluteFill>
  );
};
