// 全Capテンプレ共通の「質感」レイヤー。
// CapCut系テンプレの見栄えの正体＝色グレーディング＋ビネット＋フィルムグレイン＋
// カットの勢い（パンチズーム/白フラッシュ）。ここに集約して全テンプレに同じ質感を配る。
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { rnd } from "./capData";

// SVGノイズ（データURI）＝フィルムグレイン素材
const GRAIN_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter>' +
    '<rect width="240" height="240" filter="url(#n)" opacity="0.6"/></svg>'
  );

// 色グレード＋ビネット＋グレイン。dark=true で周辺を強めに落とす（暗系テンプレ用）
export const Cine: React.FC<{
  children?: React.ReactNode;
  dark?: boolean;
  grade?: string;
}> = ({ children, dark, grade }) => {
  const f = useCurrentFrame();
  const gx = Math.floor(rnd(f * 3.1) * 240);
  const gy = Math.floor(rnd(f * 7.7 + 5) * 240);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: grade || (dark ? "contrast(1.14) saturate(1.16) brightness(0.96)" : "contrast(1.06) saturate(1.12)") }}>
        {children}
      </AbsoluteFill>
      {/* ビネット */}
      <AbsoluteFill style={{ pointerEvents: "none", background: dark
        ? "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.52) 100%)"
        : "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.22) 100%)" }} />
      {/* 動くフィルムグレイン */}
      <AbsoluteFill style={{ pointerEvents: "none", opacity: dark ? 0.085 : 0.05, mixBlendMode: "overlay",
        backgroundImage: "url(\"" + GRAIN_URI + "\")", backgroundRepeat: "repeat",
        backgroundPosition: gx + "px " + gy + "px" }} />
    </AbsoluteFill>
  );
};

// カット頭のパンチズーム量（最初の数フレームだけ僅かに寄って戻る＝勢い）
export function punch(local: number, amt = 0.045, len = 7): number {
  return 1 + amt * Math.max(0, 1 - local / len);
}

// カット頭の白フラッシュ（2〜3フレーム）
export const Flash: React.FC<{ local: number; peak?: number }> = ({ local, peak = 0.5 }) => {
  const o = interpolate(local, [0, 1.5, 5], [peak, peak * 0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0.01) return null;
  return <AbsoluteFill style={{ background: "#fff", opacity: o, pointerEvents: "none" }} />;
};

// バネ風イージング（オーバーシュート付きの入り）
export function pop(local: number, from = 0.82, len = 14): number {
  const t = Math.min(1, Math.max(0, local / len));
  const s = 1.7;
  const u = t - 1;
  const b = u * u * ((s + 1) * u + s) + 1;  // back-out（軽いオーバーシュート）
  return from + (1 - from) * b;
}
