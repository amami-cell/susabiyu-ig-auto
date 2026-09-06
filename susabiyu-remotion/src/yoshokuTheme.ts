// 洋食おしゃれテンプレ共通の配色・小道具。YoshokuDish系（イタリアン/フレンチ/中立）で共有。
// 和の暖簾/短冊/筆文字は一切使わない。金・生成り・黒基調＋セリフ体で「トラットリア〜肉バル」の質感。
export type YTheme = { base: string; ink: string; sub: string; line: string; accent: string; label: string; footBase: string };

export const YTHEMES: Record<string, YTheme> = {
  // フレンチ＝GOLD：黒×金×生成り
  french:  { base: "#0c0c0e", ink: "#F5F0E6", sub: "#CBB98F", line: "#C9A24B", accent: "#E7C873", label: "BISTRO FRANÇAIS", footBase: "#0a0a0c" },
  // イタリアン：温かみのある生成り×クリーム地に、差し色＝テラコッタ（肉バルの熱量／焦点色）。
  // accent/line を淡クリームから暖赤テラコッタへ変更＝仕切り線・店名・帯が背景に溶けず前に出る。
  // 差し色は全て暗色地の上でのみ使うため、暖赤でも視認性は十分（ink=クリーム, sub=タンとの3階層）。
  italian: { base: "#17110b", ink: "#F6EFE0", sub: "#D6C4A0", line: "#C0562F", accent: "#E0673A", label: "MEAT BAR", footBase: "#120d08" },
  // 既定：ニュートラルな上品ダーク
  neutral: { base: "#111113", ink: "#F2EFEA", sub: "#BFB9AE", line: "#CBB98F", accent: "#E4D6B4", label: "RESTAURANT", footBase: "#0d0d0f" },
};

export const yclamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 洋食テンプレ共通の長さ（8秒＝240f）。音楽フェードもこれに合わせる。
export const Y_DUR = 240;

export function ytheme(name?: string): YTheme {
  return YTHEMES[name || "neutral"] || YTHEMES.neutral;
}
