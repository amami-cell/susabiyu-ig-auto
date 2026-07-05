// 画像投稿の追加デザイン（採用候補E/G）。写真は切り抜かず全体表示・余白は詰める。
// フォントはポップ体をやめ、動画と同じ筆文字(YujiSyuku)＋太ゴシック(RocknRoll One)に統一。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryGenre, photoStorySeed } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { KIIRO, KURO, fuchi, Shuchusen, pickFuda } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
function pickTag(): string {
  return pickFuda(photoStoryGenre, photoStorySeed, photoStoryCaption);
}

// 手描き風うずまき（SVGスパイラル）
const Uzumaki: React.FC<{ x: number; y: number; size: number; color: string; opacity?: number }> = ({ x, y, size, color, opacity = 0.5 }) => {
  const pts = [];
  const turns = 3.2;
  const N = 140;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * turns * Math.PI * 2;
    const r = (size / 2) * t;
    pts.push((size / 2 + Math.cos(a) * r) + "," + (size / 2 + Math.sin(a) * r));
  }
  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}
      style={{ position: "absolute", left: x, top: y, opacity }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray="26 12" />
    </svg>
  );
};

// ── 案E: 黄色×うずまき（余白を詰め、筆文字＋太ゴシックに） ──
export const TaishuImgE: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const MIDORI = "#1f4038";
  return (
    <AbsoluteFill style={{ backgroundColor: "#f5c936" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 250, background: "#f4ecd7" }} />
      <Uzumaki x={-110} y={-90} size={430} color={MIDORI} />
      <Uzumaki x={790} y={-40} size={360} color={MIDORI} />
      <Uzumaki x={-80} y={1590} size={320} color={MIDORI} opacity={0.35} />
      <Uzumaki x={830} y={1600} size={340} color={MIDORI} opacity={0.35} />
      {/* タイトル（筆文字・白フチ） */}
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: MIDORI, fontFamily: fude, fontSize: 104, letterSpacing: 4, ...fuchi("#ffffff", 8) }}>{pickTag()}</span>
      </div>
      <div style={{ position: "absolute", top: 232, left: 120, right: 120, borderTop: "7px dotted " + MIDORI, opacity: 0.75 }} />
      {/* 営業時間（上下を点線で区切る） */}
      <div style={{ position: "absolute", top: 258, left: 0, right: 0, textAlign: "center", lineHeight: 1.5 }}>
        <div style={{ color: MIDORI, fontFamily: goshi, fontWeight: 800, fontSize: 46, letterSpacing: 2 }}>平日　　16:00〜23:00</div>
        <div style={{ color: MIDORI, fontFamily: goshi, fontWeight: 800, fontSize: 46, letterSpacing: 2 }}>土日祝　11:00〜23:00</div>
      </div>
      <div style={{ position: "absolute", top: 420, left: 120, right: 120, borderTop: "7px dotted " + MIDORI, opacity: 0.75 }} />
      {/* 写真：丸角カード・大きく（全体表示） */}
      <div style={{ position: "absolute", top: 448, left: 0, right: 0, bottom: 235, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ background: "#fff", padding: 10, borderRadius: 26, boxShadow: "0 20px 50px rgba(90,70,10,0.35)", lineHeight: 0 }}>
          <Img src={staticFile(photoStoryPhoto)} style={{ display: "block", maxWidth: 1030, maxHeight: 1320, width: "auto", height: "auto",
            borderRadius: 20, filter: "saturate(1.12) contrast(1.04)" }} />
        </div>
      </div>
      {/* キャプション（太ゴシック） */}
      <div style={{ position: "absolute", bottom: 138, left: 0, right: 0, textAlign: "center", padding: "0 36px" }}>
        <span style={{ color: MIDORI, fontFamily: goshi, fontWeight: 800, fontSize: oneLineFont(photoStoryCaption, 960, 54, 2, 28), whiteSpace: "nowrap" }}>{photoStoryCaption}</span>
      </div>
      <div style={{ position: "absolute", bottom: 62, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: MIDORI, fontFamily: goshi, fontWeight: 800, fontSize: 30 }}>大衆酒場 すさび湯三条　{handle}</span>
      </div>
    </AbsoluteFill>
  );
};

// ── 案G: メニューPOP（余白を詰め、見出しは筆文字白フチに） ──
export const TaishuImgG: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const AKAI = "#d7231a";
  return (
    <AbsoluteFill style={{ background: "repeating-linear-gradient(180deg,#dcbd90 0 6px,#d2b183 6px 150px)" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.28) 0%, rgba(120,80,30,0.22) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: -960, height: 1920, opacity: 0.5 }}>
        <Shuchusen color="rgba(60,40,20,0.5)" opacity={0.8} />
      </div>
      {/* 右上：店舗ロゴ（大きめ） */}
      <div style={{ position: "absolute", top: 76, right: 56 }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 420, height: "auto", maxHeight: 190, objectFit: "contain",
          filter: "drop-shadow(0 5px 16px rgba(60,30,0,0.7))" }} />
      </div>
      {/* 見出し（太ゴシック・赤×白フチでドン） */}
      <div style={{ position: "absolute", top: 262, left: 0, right: 0, textAlign: "center", padding: "0 34px" }}>
        <span style={{ color: AKAI, fontFamily: goshi, fontWeight: 800, fontSize: 84,
          whiteSpace: "nowrap", ...fuchi("#ffffff", 8) }}>本日も元気に営業中。</span>
      </div>
      {/* 写真：大きく全体表示 */}
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, bottom: 200, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Img src={staticFile(photoStoryPhoto)} style={{ maxWidth: 1010, maxHeight: 1180, width: "auto", height: "auto",
          filter: "saturate(1.15) contrast(1.05) drop-shadow(0 24px 40px rgba(60,30,0,0.35))" }} />
      </div>
      {/* 下：営業時間 */}
      <div style={{ position: "absolute", bottom: 172, left: 0, right: 0, textAlign: "center", lineHeight: 1.55 }}>
        <div style={{ color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 46, letterSpacing: 2, ...fuchi("#ffffff", 6) }}>平日　　16:00〜23:00</div>
        <div style={{ color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 46, letterSpacing: 2, ...fuchi("#ffffff", 6) }}>土日祝　11:00〜23:00</div>
      </div>
      {/* 右側：縦書きの黄マーカー文字 */}
      <div style={{ position: "absolute", right: 66, top: 640 }}>
        <span style={{ writingMode: "vertical-rl", background: KIIRO, boxShadow: "0 0 0 8px " + KIIRO,
          color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 46, letterSpacing: 6, lineHeight: 1.2 } as React.CSSProperties}>{pickTag()}</span>
      </div>
      <div style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 30, letterSpacing: 1 }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
