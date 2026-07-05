// 大衆④「回転レーン・白昼版」＝明るい生成りの店内で皿が流れる世界観。
// 白っぽい背景＋紺の縁のレーンの上を皿が流れ、品名は縦書きの木札（明朝体）。
// 赤提灯とタイトルの朱が差し色。黄札×ゴシックのチラシ系とは別物の、明るく賑わう空気にする。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { Cine } from "./cine";
import { Lanterns, tpick, taishuMusic } from "./taishu";

const { fontFamily: mincho } = loadMincho();
export const TKAI_DUR = 250;
const NAVY = "#1c3454";
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
              {/* 白磁の皿（白フチ＋やわらかい影） */}
              <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: "10px solid #ffffff",
                boxShadow: "0 14px 34px rgba(60,45,20,0.35)", flexShrink: 0 }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              {/* 縦書きの木札 */}
              <div style={{ marginTop: 16, background: "linear-gradient(180deg,#e8d5ae,#d3b984)", border: "3px solid #6b4a26",
                borderRadius: 6, padding: "18px 10px", boxShadow: "0 8px 18px rgba(60,45,20,0.35)" }}>
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

// 紺の縁が付いたレーン台（明るい生成りのベルト）
const LaneBase: React.FC<{ top: number; height: number }> = ({ top, height }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, height,
    background: "linear-gradient(180deg,#fdfaf2,#f3ecdc)",
    borderTop: "16px solid " + NAVY, borderBottom: "16px solid " + NAVY,
    boxShadow: "0 12px 30px rgba(40,50,80,0.18)" }} />
);

export const TaishuKaiten: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const tS = interpolate(f, [4, 12], [1.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tO = interpolate(f, [4, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endO = interpolate(f, [TKAI_DUR - 10, TKAI_DUR], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#faf6ec", opacity: endO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TKAI_DUR - 18, TKAI_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.04) saturate(1.12) brightness(1.02)">
        {/* 背景＝明るい生成り。上からほんのり陽の光 */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg,#fdfbf4 0%,#f6f0e1 45%,#efe6d2 100%)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% -4%, rgba(255,220,160,0.35) 0%, rgba(0,0,0,0) 40%)" }} />
        {/* レーン台2段（縁は紺） */}
        <LaneBase top={584} height={500} />
        <LaneBase top={1234} height={500} />
        {/* 揺れる赤提灯（差し色） */}
        <Lanterns />
        {/* タイトル（明朝の朱で堂々と） */}
        <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", opacity: tO, transform: "scale(" + tS + ")" }}>
          <span style={{ color: "#a31226", fontFamily: mincho, fontWeight: 700, fontSize: 88, letterSpacing: 8,
            textShadow: "0 3px 0 #ffffff, 0 8px 22px rgba(120,40,20,0.25)" }}>本日も大賑わい</span>
        </div>
        {/* 2レーン：上下で位相をずらす（上下で別の商品） */}
        <Lane photos={TOP_PHOTOS} y={620} offset={0} size={400} />
        <Lane photos={BOT_PHOTOS} y={1270} offset={280} size={400} />
        <div style={{ position: "absolute", bottom: 46, width: "100%", textAlign: "center" }}>
          <span style={{ color: NAVY, fontFamily: mincho, fontWeight: 700, fontSize: 34, letterSpacing: 4 }}>{handle}</span>
        </div>
      </Cine>
    </AbsoluteFill>
  );
};
