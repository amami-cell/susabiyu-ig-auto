// 大衆酒場トーン共通部品：赤×黄×黒・極太文字・集中線・値札・帯・掛け声。
// 「元気・活気・ワイワイ」の三条向けデザイン言語をここに集約する。
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { tempoPhotos, tempoMusic } from "./tempoData";

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
