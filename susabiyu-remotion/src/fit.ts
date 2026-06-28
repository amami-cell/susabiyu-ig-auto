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

// 料理名の中の数字（半角0-9 / 全角０-９）を漢数字に置き換える。お品書きの体裁用。
// 例: 「巻き寿司集合３」→「巻き寿司集合三」
const _KMAP: Record<string, string> = {
  "0": "〇", "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九",
  "０": "〇", "１": "一", "２": "二", "３": "三", "４": "四", "５": "五", "６": "六", "７": "七", "８": "八", "９": "九",
};
export function kanjiNum(s: string): string {
  return Array.from(s || "").map((c) => _KMAP[c] || c).join("");
}
