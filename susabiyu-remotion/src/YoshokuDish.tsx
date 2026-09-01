// 洋食・本日の一皿（おしゃれ）：料理写真を主役に、上品なセリフ×余白×細い縁取り。
// 和の暖簾/短冊は一切使わない。theme で配色を切替（french=黒×金 / italian=温かみ生成り）。
// 料理データは他テンプレと同じ typoData（fetch_typo.py が生成）を利用。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadMincho();
const { fontFamily: serif } = loadSerif();
export const YOSHOKU_DUR = 240;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

type Theme = { base: string; ink: string; sub: string; line: string; accent: string; label: string; footBase: string };
const THEMES: Record<string, Theme> = {
  // フレンチ＝GOLD：黒×金×生成り
  french:  { base: "#0c0c0e", ink: "#F5F0E6", sub: "#CBB98F", line: "#C9A24B", accent: "#E7C873", label: "BISTRO FRANÇAIS", footBase: "#0a0a0c" },
  // イタリアン：温かみのある生成り×オリーブ×テラコッタ
  italian: { base: "#17110b", ink: "#F6EFE0", sub: "#D6C4A0", line: "#E3D6B6", accent: "#E7DCC4", label: "TRATTORIA", footBase: "#120d08" },
  // 既定：ニュートラルな上品ダーク
  neutral: { base: "#111113", ink: "#F2EFEA", sub: "#BFB9AE", line: "#CBB98F", accent: "#E4D6B4", label: "RESTAURANT", footBase: "#0d0d0f" },
};

export const YoshokuDish: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "GOLD京都ポルタ",
  handle = "@gold_kyotovolta",
  theme = "neutral",
}) => {
  const f = useCurrentFrame();
  const DUR = YOSHOKU_DUR;
  const T = THEMES[theme] || THEMES.neutral;
  const hero = typoPhotos[0] || { src: "", caption: "" };

  // やわらかなフェード＆ゆっくりズーム（スタンプ/フラッシュ無し＝上品）
  const cardO = interpolate(f, [6, 24], [0, 1], clamp);
  const cardY = interpolate(f, [6, 26], [34, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const zoom = interpolate(f, [0, DUR], [1.06, 1.16], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.12, 1.24], clamp);
  const labelO = interpolate(f, [16, 34], [0, 1], clamp);
  const ruleW = interpolate(f, [18, 44], [0, 150], { ...clamp, easing: Easing.out(Easing.cubic) });
  const nameO = interpolate(f, [40, 58], [0, 1], clamp);
  const nameY = interpolate(f, [40, 60], [26, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const underW = interpolate(f, [58, 84], [0, 200], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tagO = interpolate(f, [70, 88], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 46, DUR - 30], [0, 1], clamp);

  const nameSize = oneLineFont(hero.caption, 860, 78, 2, 42);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart||0)*30)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 背景：同じ写真を暗めボカシで敷く（落ち着いた奥行き） */}
      <AbsoluteFill style={{ opacity: 0.5 }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + bgScale + ")", filter: "blur(30px) brightness(0.4) saturate(1.05)" }} />
      </AbsoluteFill>
      {/* 上下ビネットで文字を締める */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + "F2 0%, " + T.base + "22 26%, " + T.base + "22 70%, " + T.base + "F7 100%)" }} />

      {/* 上部：Latin ラベル＋細い横罫（レターとルールで上質に） */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, opacity: labelO }}>
        <div style={{ width: ruleW, height: 1, background: T.line, opacity: 0.9 }} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 10, fontWeight: 600 }}>{T.label}</div>
        <div style={{ width: ruleW, height: 1, background: T.line, opacity: 0.9 }} />
      </div>

      {/* 主役：料理写真カード（細い縁取り＋やわらかな影＋内側ゆっくりズーム） */}
      <div style={{ position: "absolute", top: 260, left: 96, width: 888, height: 980, opacity: cardO, transform: "translateY(" + cardY + "px)" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", border: "1.5px solid " + T.line, boxShadow: "0 30px 70px rgba(0,0,0,0.55)" }}>
          <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + zoom + ")" }} />
        </div>
        {/* 角の細い金/生成りのアクセント枠（さりげない上質感） */}
        <div style={{ position: "absolute", top: -10, left: -10, width: 46, height: 46, borderTop: "2px solid " + T.accent, borderLeft: "2px solid " + T.accent, opacity: 0.9 }} />
        <div style={{ position: "absolute", bottom: -10, right: -10, width: 46, height: 46, borderBottom: "2px solid " + T.accent, borderRight: "2px solid " + T.accent, opacity: 0.9 }} />
      </div>

      {/* 料理名（明朝・大）＋短いアクセント下線 */}
      <div style={{ position: "absolute", top: 1300, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: nameSize, fontWeight: 600, letterSpacing: 4, textShadow: "0 2px 18px rgba(0,0,0,0.5)" }}>{hero.caption}</div>
        <div style={{ margin: "26px auto 0", width: underW, height: 2, background: T.accent, opacity: 0.95 }} />
      </div>

      {/* 一言（ヘッドライン・小） */}
      <div style={{ position: "absolute", top: 1440, left: 0, right: 0, textAlign: "center", opacity: tagO }}>
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: 34, letterSpacing: 3 }}>{typoHeadline}</div>
      </div>

      {/* フッター：店名 ・ ハンドル（Latinはセリフ体で上品に） */}
      <div style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center", opacity: footO }}>
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 40, letterSpacing: 6, fontWeight: 600 }}>{storeName}</div>
        <div style={{ marginTop: 10, fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 4 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
