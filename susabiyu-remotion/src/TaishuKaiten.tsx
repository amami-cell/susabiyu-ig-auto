// 大衆④「回転レーン・白昼版」＝明るい生成りの店内で皿が流れる世界観。
// 紺のれんをくぐって入店 → 白っぽい背景＋紺の縁のレーンを皿が流れる →
// 紺のれんの前でロゴ・屋号・営業時間のクローズ。赤提灯とタイトルの朱が差し色。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { Cine } from "./cine";
import { Lanterns, tpick, taishuMusic } from "./taishu";

const { fontFamily: mincho } = loadMincho();
const NAVY = "#1c3454";
const NAVY2 = "#142842";
const INTRO = 56;    // のれんくぐり
const MAIN = 250;    // レーン
const OUTRO = 84;    // クローズ（ロゴ・屋号・営業時間）
export const TKAI_DUR = INTRO + MAIN + OUTRO;
const OUT_START = INTRO + MAIN;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ALL = tpick(6);
// 上下のレーンで別の商品が流れるように半分ずつに分ける
const TOP_PHOTOS = ALL.filter((_, i) => i % 2 === 0);
const BOT_PHOTOS = ALL.filter((_, i) => i % 2 === 1);
const CARD_W = 560;                     // 皿1枚の幅（間隔）
const SPEED = 7;                        // px/フレーム

// 紺のれん1枚ぶん（縦のパネル）
const NorenPanel: React.FC<{ left: number; width: number; x: number; rot: number }> = ({ left, width, x, rot }) => (
  <div style={{ position: "absolute", left, top: 0, width, height: "100%",
    background: "linear-gradient(180deg,#24426e 0%," + NAVY + " 30%," + NAVY2 + " 100%)",
    boxShadow: "inset -6px 0 12px rgba(0,0,0,0.25)",
    transform: "translateX(" + x + "px) rotate(" + rot + "deg)", transformOrigin: "50% 0%" }} />
);

// オープニング：紺のれん（白ロゴ入り）が左右にふわっと開いて入店
const NorenGate: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= INTRO + 4) return null;
  const part = interpolate(f, [26, INTRO - 4], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const logoO = interpolate(f, [0, 8, 22, 32], [0, 1, 1, 0], clamp);
  const logoS = interpolate(f, [0, 14], [1.18, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const dirs = [-2, -1, 1, 2];   // 4枚が中央から左右へ開く
  return (
    <AbsoluteFill>
      {dirs.map((d, i) => (
        <NorenPanel key={i} left={i * 270} width={272} x={part * d * 420} rot={part * d * 3} />
      ))}
      <div style={{ position: "absolute", top: "34%", left: 0, width: "100%", textAlign: "center",
        opacity: logoO, transform: "scale(" + logoS + ")" }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 620, height: "auto", objectFit: "contain",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.45))" }} />
      </div>
    </AbsoluteFill>
  );
};

// クローズ：紺のれんの前に ロゴ・屋号・営業時間（大きめ）
const Outro: React.FC<{ storeName: string; handle: string }> = ({ storeName, handle }) => {
  const f = useCurrentFrame();
  const t = f - OUT_START;
  if (t < 0) return null;
  const o = interpolate(t, [0, 12, OUTRO - 10, OUTRO], [0, 1, 1, 0], clamp);
  const y = interpolate(t, [0, 14], [26, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const line = (w: number) => (
    <div style={{ width: w, height: 3, background: "rgba(255,255,255,0.75)", borderRadius: 2, margin: "0 auto" }} />
  );
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {/* 紺のれんの背景（静止） */}
      <AbsoluteFill style={{ background: NAVY2 }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: "absolute", left: i * 270, top: 0, width: 272, height: "100%",
          background: "linear-gradient(180deg,#24426e 0%," + NAVY + " 30%," + NAVY2 + " 100%)",
          boxShadow: "inset -6px 0 12px rgba(0,0,0,0.25)" }} />
      ))}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40,
          transform: "translateY(" + y + "px)" }}>
          {/* ロゴ大きめ */}
          <Img src={staticFile("storelogo_white.png")} style={{ width: 680, height: "auto", objectFit: "contain",
            filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.5))" }} />
          {/* 屋号大きめ */}
          <div style={{ color: "#ffffff", fontFamily: mincho, fontWeight: 700, fontSize: 62, letterSpacing: 6,
            textShadow: "0 4px 16px rgba(0,0,0,0.45)" }}>{storeName}</div>
          {/* 営業時間（区切り線つきで大きめ） */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
            {line(620)}
            <div style={{ color: "#ffffff", fontFamily: mincho, fontWeight: 700, fontSize: 54, letterSpacing: 3 }}>平日　　16:00〜23:00</div>
            <div style={{ color: "#ffffff", fontFamily: mincho, fontWeight: 700, fontSize: 54, letterSpacing: 3 }}>土日祝　11:00〜23:00</div>
            {line(620)}
          </div>
          <div style={{ color: "#cfe0f5", fontFamily: mincho, fontSize: 38, letterSpacing: 3 }}>{handle}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

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

export const TaishuKaiten: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  // タイトルはのれんが開いた直後に登場
  const tS = interpolate(f, [INTRO - 6, INTRO + 4], [1.8, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tO = interpolate(f, [INTRO - 6, INTRO - 2], [0, 1], clamp);
  // レーン本編はクローズの手前でフェードアウト
  const mainO = interpolate(f, [OUT_START - 10, OUT_START + 2], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#faf6ec" }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TKAI_DUR - 20, TKAI_DUR], [0, 0.9, 0.9, 0], clamp)} />
      <Cine grade="contrast(1.04) saturate(1.12) brightness(1.02)">
        <AbsoluteFill style={{ opacity: mainO }}>
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
        </AbsoluteFill>
        {/* オープニング：紺のれんをくぐって入店 */}
        <NorenGate />
        {/* クローズ：ロゴ・屋号・営業時間 */}
        <Outro storeName={storeName} handle={handle} />
      </Cine>
    </AbsoluteFill>
  );
};
