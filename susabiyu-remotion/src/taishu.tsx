// 大衆酒場トーン共通部品：赤×黄×黒・極太文字・集中線・値札・帯・掛け声。
// 「元気・活気・ワイワイ」の三条向けデザイン言語をここに集約する。
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { loadFont as loadFudeT } from "@remotion/google-fonts/YujiSyuku";
import { rnd } from "./capData";

const { fontFamily: fudeT } = loadFudeT();

export const AKA = "#d7263d";      // 大衆の赤
export const AKA_DARK = "#a31226";
export const KIIRO = "#ffd23f";    // 値札の黄
export const KURO = "#1a1410";     // 締めの黒
export const SHIRO = "#fff6e8";    // 生成りの白

export type TPhoto = { src: string; caption: string };
// tempo写真だけを使う（他データはCIで取得されない場合があるため）。足りなければ巡回。
export function tpick(n: number, off = 0): TPhoto[] {
  const out: TPhoto[] = [];
  const L = Math.max(1, tempoPhotos.length);
  for (let i = 0; i < n; i++) out.push(tempoPhotos[(off + i) % L]);
  return out;
}
export const taishuMusic = tempoMusic;

// 極太文字のフチ（白フチ＋黒影）。大衆チラシの文字はこれで作る。
export function fuchi(color: string, size = 6): React.CSSProperties {
  const s = size, o = [];
  for (let dx = -s; dx <= s; dx += s) for (let dy = -s; dy <= s; dy += s)
    if (dx || dy) o.push(dx + "px " + dy + "px 0 " + color);
  o.push("0 " + (s + 6) + "px 14px rgba(0,0,0,0.45)");
  return { textShadow: o.join(",") };
}

// 集中線（マンガの勢い線）。flash=trueで点滅。
export const Shuchusen: React.FC<{ color?: string; opacity?: number; flash?: boolean }> = ({ color = "rgba(26,20,16,0.85)", opacity = 1, flash }) => {
  const f = useCurrentFrame();
  const o = flash ? (Math.floor(f / 3) % 2 === 0 ? opacity : opacity * 0.55) : opacity;
  const lines = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + (i % 2) * 0.05;
    const len = 260 + (i % 3) * 90;
    const x1 = 540 + Math.cos(a) * 1400, y1 = 960 + Math.sin(a) * 1400;
    const x2 = 540 + Math.cos(a) * (1400 - len), y2 = 960 + Math.sin(a) * (1400 - len);
    lines.push(<polygon key={i} points={x1 + "," + y1 + " " + (x1 + Math.cos(a + 1.57) * 26) + "," + (y1 + Math.sin(a + 1.57) * 26) + " " + x2 + "," + y2} fill={color} />);
  }
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">{lines}</svg>
    </AbsoluteFill>
  );
};

// 値札（黄色い札に赤文字・少し傾く・ドンと入る）
export const Fuda: React.FC<{ text: string; x: number; y: number; deg?: number; local: number; font: string; size?: number }> = ({ text, x, y, deg = -7, local, font, size = 54 }) => {
  const s = interpolate(local, [0, 7], [2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const o = interpolate(local, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "rotate(" + deg + "deg) scale(" + s + ")", opacity: o,
      background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "14px 26px",
      boxShadow: "6px 8px 0 rgba(0,0,0,0.35)" }}>
      <span style={{ color: AKA_DARK, fontFamily: font, fontWeight: 800, fontSize: size, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

// 赤帯（下部の品名帯）
export const AkaObi: React.FC<{ text: string; font: string; bottom?: number }> = ({ text, font, bottom = 150 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom, textAlign: "center" }}>
    <div style={{ display: "inline-block", background: AKA, border: "5px solid " + SHIRO, borderRadius: 6,
      padding: "14px 44px", transform: "rotate(-1.5deg)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
      <span style={{ color: SHIRO, fontFamily: font, fontWeight: 800, fontSize: 52, letterSpacing: 2, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  </div>
);

// のれん風の赤ストライプ背景
export const NorenBg: React.FC = () => (
  <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, " + AKA + " 0 216px, " + AKA_DARK + " 216px 220px)" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.25) 100%)" }} />
  </AbsoluteFill>
);


// ── 各テンプレ専用の世界観背景（1パターン化を防ぐため全部違う） ──

// チラシ用：放射バースト（ゆっくり回転）。色は差し替え可（レトロ配色にも使う）
export const SunburstBg: React.FC<{ speed?: number; c1?: string; c2?: string }> = ({ speed = 0.12, c1 = AKA, c2 = KIIRO }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: c2, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -960, top: -540, width: 3000, height: 3000,
        background: "repeating-conic-gradient(" + c1 + " 0deg 12deg, " + c2 + " 12deg 24deg)",
        borderRadius: "50%", transform: "rotate(" + f * speed + "deg)", opacity: 0.92 }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 46%, rgba(255,246,210,0.92) 0%, rgba(255,246,210,0) 48%)" }} />
    </AbsoluteFill>
  );
};

// ── 質感レイヤー（ベタ塗りのチープ見え防止。④提灯と同じ土俵に乗せる）──
const TEX_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">' +
    '<filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3"/></filter>' +
    '<rect width="300" height="300" filter="url(#p)" opacity="0.7"/></svg>'
  );

// 紙・黒板・布のざらつき
export const Tex: React.FC<{ opacity?: number; blend?: "overlay" | "multiply" | "soft-light" }> = ({ opacity = 0.1, blend = "overlay" }) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: blend,
    backgroundImage: "url(\"" + TEX_URI + "\")", backgroundRepeat: "repeat" }} />
);

// レトロ印刷の網点（昭和ポスターの刷り感）
export const Halftone: React.FC<{ opacity?: number; color?: string }> = ({ opacity = 0.1, color = "rgba(90,30,10,0.8)" }) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity,
    backgroundImage: "radial-gradient(" + color + " 1.4px, transparent 1.4px)", backgroundSize: "13px 13px" }} />
);

// 上からの温かい灯り（電球色スポット）
export const Spot: React.FC<{ x?: string; y?: string; color?: string; opacity?: number }> = ({ x = "50%", y = "0%", color = "255,190,110", opacity = 0.22 }) => (
  <AbsoluteFill style={{ pointerEvents: "none",
    background: "radial-gradient(ellipse at " + x + " " + y + ", rgba(" + color + "," + opacity + ") 0%, rgba(0,0,0,0) 55%)" }} />
);

// 手書き用：クラフト紙
export const KraftBg: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(160deg,#cda36c 0%,#bb8e57 55%,#a97e49 100%)" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.15) 0%, rgba(60,40,20,0.25) 100%)" }} />
  </AbsoluteFill>
);

// ネオン用：夜の闇＋ボケ光＋街灯りの照り返し
export const NightBg: React.FC = () => {
  const f = useCurrentFrame();
  const dots = [];
  for (let i = 0; i < 20; i++) {
    const x = rnd(i * 13.3) * 1080, y = rnd(i * 7.7 + 3) * 1700;
    const r = 40 + rnd(i * 3.1) * 110;
    const drift = Math.sin(f * 0.02 + i) * 22;
    const col = i % 3 === 0 ? "255,80,130" : i % 3 === 1 ? "255,190,60" : "70,200,255";
    dots.push(<div key={i} style={{ position: "absolute", left: x, top: y + drift, width: r, height: r, borderRadius: "50%",
      background: "rgba(" + col + ",0.4)", filter: "blur(" + r / 3 + "px)" }} />);
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#0d0a14 0%,#170f20 100%)" }}>
      {dots}
      {/* 下端に街灯りの照り返し */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 104%, rgba(255,120,50,0.16) 0%, rgba(0,0,0,0) 45%)" }} />
    </AbsoluteFill>
  );
};

// 黒板用：緑黒板＋木枠
export const BlackboardBg: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg,#7a4e2b,#5d3920)", padding: 34 }}>
    <div style={{ width: "100%", height: "100%", borderRadius: 12,
      background: "radial-gradient(ellipse at 50% 38%, #37564b 0%, #274138 70%, #1f342d 100%)",
      boxShadow: "inset 0 0 70px rgba(0,0,0,0.55)" }} />
  </AbsoluteFill>
);

// 店内用：ぶら下がる赤提灯（ゆらゆら）。文字・大きさは差し替え可（筆フォント）。
export const Lanterns: React.FC<{ moji?: string[]; scale?: number }> = ({ moji = ["酒", "寿", "司", "肴"], scale = 1 }) => {
  const f = useCurrentFrame();
  const xs = [120, 400, 680, 940];
  const w = 112 * scale, h = 152 * scale;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {xs.map((x, i) => {
        const sway = Math.sin(f * 0.05 + i * 1.6) * 5;
        return (
          <div key={i} style={{ position: "absolute", left: x - (w - 112) / 2, top: -6, transform: "rotate(" + sway + "deg)", transformOrigin: "top center" }}>
            <div style={{ width: 4, height: 62 * scale, background: "#3a2a18", margin: "0 auto" }} />
            <div style={{ width: w, height: h, borderRadius: 54 * scale, border: "3px solid #7a1020",
              background: "radial-gradient(circle at 50% 42%, #ff7161 0%, " + AKA + " 62%, " + AKA_DARK + " 100%)",
              boxShadow: "0 0 46px rgba(255,90,60,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ writingMode: "vertical-rl", color: "#ffe9d0", fontSize: 40 * scale, fontFamily: fudeT } as React.CSSProperties}>{moji[i % moji.length]}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ネオン発光文字のスタイル
export function neon(color: string): React.CSSProperties {
  return { color: "#fff", textShadow: "0 0 6px #fff, 0 0 14px " + color + ", 0 0 34px " + color + ", 0 0 80px " + color };
}

// マーカーで引いた蛍光ハイライト
export function marker(color = "rgba(255,220,60,0.75)"): React.CSSProperties {
  return { background: "linear-gradient(transparent 58%, " + color + " 58%, " + color + " 92%, transparent 92%)" };
}

// 黄札の言葉選び：生成ごとの乱数(seed)で選び、キャプションと同じ言葉の札は避ける。
// （「一番人気、今日もあります！」の写真に「一番人気」の札が付く重複を防ぐ）
const FUDA_FOOD = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];
const FUDA_ATMO = ["営業中", "今夜もにぎやか", "本日も元気", "お待ちしてます"];
export function pickFuda(genre: string, seed: number, caption: string): string {
  const pool = genre === "atmo" ? FUDA_ATMO : FUDA_FOOD;
  const start = Math.abs(seed) % pool.length;
  for (let k = 0; k < pool.length; k++) {
    const t = pool[(start + k) % pool.length];
    if (!caption.includes(t.replace("！", ""))) return t;
  }
  return pool[start];
}
