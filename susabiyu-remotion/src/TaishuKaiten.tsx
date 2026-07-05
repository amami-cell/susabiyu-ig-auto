// 大衆④「回転レーン・夜店内版」＝赤提灯が揺れる夜の店内の世界観。
// 暗い店内＋木のカウンターの上を皿が流れ、品名は縦書きの木札（明朝体）。
// 黄札×ゴシックのチラシ系とは別物の、しっとり賑わう空気にする。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { Cine } from "./cine";
import { Lanterns, tpick, taishuMusic } from "./taishu";

const { fontFamily: mincho } = loadMincho();
export const TKAI_DUR = 250;
const ALL = tpick(6);
// 上下のレーンで別の商品が流れるように半分ずつに分ける
const TOP_PHOTOS = ALL.filter((_, i) => i % 2 === 0);
const BOT_PHOTOS = ALL.filter((_, i) => i % 2 === 1);
const CARD_W = 560;                     // 皿1枚の幅（間隔）
const SPEED = 7;                        // px/フレーム

// 1レーンぶん：皿が右→左へ流れ続ける（巡回）。品名は縦書きの木札。
const Lane: React.FC<{ photos: typeof ALL; y: number; offset: number; size: number }> = ({ photos, y, offset, size }) => {
  const f = useCurrentFrame();
  const total = photos.length * CARD_W;
  return (
    <div style={{ position: "absolute", top: y, left: 0, width: 1080, height: size + 40 }}>
      {photos.map((p, i) => {
        const x0 = ((i * CARD_W - f * SPEED - offset) % total + total) % total;
        const left = x0 - CARD_W;   // -CARD_W〜total-CARD_W を巡回＝右から入って左へ抜ける
        return (
          <div key={i} style={{ position: "absolute", left, top: 0, width: size + 130 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: "9px solid #e9dcc3",
                boxShadow: "0 16px 40px rgba(0,0,0,0.65)", flexShrink: 0 }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              {/* 縦書きの木札 */}
              <div style={{ marginTop: 16, background: "linear-gradient(180deg,#e8d5ae,#d3b984)", border: "3px solid #6b4a26",
                borderRadius: 6, padding: "18px 10px", boxShadow: "0 8px 20px rgba(0,0,0,0.5)" }}>
                <span style={{ writingMode: "vertical-rl", color: "#3a2412", fontFamily: mincho, fontWeight: 700, fontSize: 36,
                  letterSpacing: 5 } as React.CSSProperties}>{p.caption}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const TaishuKaiten: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const tS = interpolate(f, [4, 12], [1.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tO = interpolate(f, [4, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endO = interpolate(f, [TKAI_DUR - 10, TKAI_DUR], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#160f0a", opacity: endO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TKAI_DUR - 18, TKAI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.08) saturate(1.2) brightness(1.0)">
        {/* 背景＝夜の店内。上は闇、提灯の灯りがほんのり */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg,#0f0a06 0%,#241610 40%,#1a1008 100%)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 8%, rgba(255,120,60,0.20) 0%, rgba(0,0,0,0) 45%)" }} />
        {/* 木のカウンター2段（板目ライン入り） */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, height: 560,
          background: "repeating-linear-gradient(180deg,#57361e 0 6px,#4a2c17 6px 140px)", boxShadow: "0 -10px 40px rgba(0,0,0,0.7)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1210, height: 560,
          background: "repeating-linear-gradient(180deg,#4a2c17 0 6px,#3d2412 6px 140px)", boxShadow: "0 -10px 40px rgba(0,0,0,0.7)" }} />
        {/* 揺れる赤提灯 */}
        <Lanterns />
        {/* タイトル（明朝でしっとり太く） */}
        <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", opacity: tO, transform: "scale(" + tS + ")" }}>
          <span style={{ color: "#f5e6c8", fontFamily: mincho, fontWeight: 700, fontSize: 88, letterSpacing: 8,
            textShadow: "0 0 26px rgba(255,140,60,0.6), 0 6px 20px rgba(0,0,0,0.8)" }}>本日も大賑わい</span>
        </div>
        {/* 2レーン：上下で位相をずらす */}
        <Lane photos={TOP_PHOTOS} y={620} offset={0} size={400} />
        <Lane photos={BOT_PHOTOS} y={1270} offset={280} size={400} />
        <div style={{ position: "absolute", bottom: 46, width: "100%", textAlign: "center" }}>
          <span style={{ color: "#e9dcc3", fontFamily: mincho, fontSize: 34, letterSpacing: 4, textShadow: "0 4px 14px rgba(0,0,0,0.8)" }}>{handle}</span>
        </div>
      </Cine>
    </AbsoluteFill>
  );
};
