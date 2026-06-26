// 与えられたテキストが指定幅で1行に収まるフォントサイズを返す（日本語=ほぼ全角想定）。
// whiteSpace:"nowrap" と併用して「どの言葉でも1行」を保証する。
export function oneLineFont(
  text: string,
  maxWidth: number,
  baseSize: number,
  letterSpacing = 0,
  minSize = 28
): number {
  const n = Math.max(1, Array.from(text || "").length);
  const fit = (maxWidth - (n - 1) * letterSpacing) / (n * 1.06);
  return Math.max(minSize, Math.min(baseSize, Math.floor(fit)));
}
