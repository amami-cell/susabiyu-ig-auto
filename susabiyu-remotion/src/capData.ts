// CapCut風テンプレ（Cap〜シリーズ）共通の写真プール。
// fetch_drive_photos / fetch_tempo / fetch_typo 実行後の3データを合流して使う。
import { tempoPhotos, tempoMusic } from "./tempoData";
import { typoPhotos, typoMusic } from "./typoData";
import { photos } from "./photoData";

export type CapPhoto = { src: string; caption: string };

const seen = new Set<string>();
export const capPool: CapPhoto[] = [...tempoPhotos, ...typoPhotos, ...photos].filter((p) => {
  if (seen.has(p.src)) return false;
  seen.add(p.src);
  return true;
});

// プールから n 枚を（足りなければ巡回して）取り出す
export function pick(n: number, offset = 0): CapPhoto[] {
  const out: CapPhoto[] = [];
  for (let i = 0; i < n; i++) out.push(capPool[(offset + i) % capPool.length]);
  return out;
}

// 決定的な擬似乱数（フレームに対して毎回同じ値＝レンダリングで安定）
export function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const capUptempo = tempoMusic;
export const capNormal = typoMusic;
