// 画像投稿の追加デザイン案（参考画像ベース）。写真は全案とも切り抜かず全体表示。
// E: 黄色×手描きうずまき（ポップ食堂） / F: 白抜き極太文字のせ / G: メニューPOP（集中線×赤極太×縦書き黄マーカー）
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadPop } from "@remotion/google-fonts/MochiyPopOne";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryGenre } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { KIIRO, KURO, fuchi, Shuchusen } from "./taishu";

const { fontFamily: pop } = loadPop();
const { fontFamily: goshi } = loadGoshi();
const FOOD_TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];
const ATMO_TAG = ["営業中", "今夜もにぎやか", "本日も元気", "お待ちしてます"];
function pickTag(): string {
  const pool = photoStoryGenre === "atmo" ? ATMO_TAG : FOOD_TAG;
  return pool[photoStoryCaption.length % pool.length];
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

// ── 案E: 黄色×うずまきのポップ食堂 ──
export const TaishuImgE: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const MIDORI = "#1f4038";
  return (
    <AbsoluteFill style={{ backgroundColor: "#f5c936" }}>
      {/* 下1/4は生成りで切り替え（参考のツートン） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 430, background: "#f4ecd7" }} />
      <Uzumaki x={-90} y={-70} size={420} color={MIDORI} />
      <Uzumaki x={760} y={60} size={360} color={MIDORI} />
      <Uzumaki x={-60} y={1520} size={330} color={MIDORI} opacity={0.35} />
      <Uzumaki x={800} y={1560} size={380} color={MIDORI} opacity={0.35} />
      {/* タイトル（札の言葉） */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: MIDORI, fontFamily: pop, fontSize: 96, letterSpacing: 4, ...fuchi("#ffffff", 8) }}>{pickTag()}</span>
      </div>
      {/* 点線の仕切り */}
      <div style={{ position: "absolute", top: 300, left: 130, right: 130, borderTop: "7px dotted " + MIDORI, opacity: 0.75 }} />
      {/* 写真：丸角カード・全体表示 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 60 }}>
        <div style={{ background: "#fff", padding: 16, borderRadius: 34, boxShadow: "0 20px 50px rgba(90,70,10,0.35)", lineHeight: 0 }}>
          <Img src={staticFile(photoStoryPhoto)} style={{ display: "block", maxWidth: 880, maxHeight: 1020, width: "auto", height: "auto",
            borderRadius: 22, filter: "saturate(1.12) contrast(1.04)" }} />
        </div>
      </AbsoluteFill>
      {/* キャプション */}
      <div style={{ position: "absolute", bottom: 235, left: 0, right: 0, textAlign: "center", padding: "0 50px" }}>
        <span style={{ color: MIDORI, fontFamily: pop, fontSize: oneLineFont(photoStoryCaption, 900, 52, 2, 27), whiteSpace: "nowrap" }}>{photoStoryCaption}</span>
      </div>
      <div style={{ position: "absolute", bottom: 140, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: MIDORI, fontFamily: pop, fontSize: 32 }}>大衆酒場 すさび湯三条　{handle}</span>
      </div>
    </AbsoluteFill>
  );
};

// ── 案F: 全面写真×白抜き極太文字のせ ──
export const TaishuImgF: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const Ume: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 66 }) => (
    <svg width={s} height={s} viewBox="0 0 60 60" style={{ position: "absolute", left: x, top: y, opacity: 0.95 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={30 + Math.cos(a) * 14} cy={30 + Math.sin(a) * 14} r="11" fill="none" stroke="#fff" strokeWidth="4" />;
      })}
      <circle cx="30" cy="30" r="4.5" fill="#fff" />
    </svg>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#e8c48d" }}>
      {/* 写真は大きく・全体表示（同系色の下地で余白を埋める） */}
      <AbsoluteFill>
        <Img src={staticFile(photoStoryPhoto)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(50px) brightness(0.95) saturate(1.15)", transform: "scale(1.2)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={staticFile(photoStoryPhoto)} style={{ maxWidth: "100%", maxHeight: 1250, width: "auto", height: "auto", filter: "saturate(1.1) contrast(1.03)" }} />
      </AbsoluteFill>
      {/* 白の細枠 */}
      <div style={{ position: "absolute", top: 90, left: 64, right: 64, bottom: 90, border: "3px solid rgba(255,255,255,0.9)" }} />
      <div style={{ position: "absolute", top: 76, left: 50, width: 260, height: 3, background: "#fff" }} />
      {/* 上：札の言葉（白抜き極太・斜め） */}
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", transform: "rotate(-4deg)" }}>
        <span style={{ color: "#fff", fontFamily: pop, fontSize: 108, letterSpacing: 2, textShadow: "0 6px 26px rgba(60,30,0,0.45)" }}>{pickTag()}</span>
      </div>
      {/* 下：キャプション（白抜き極太・斜め・2段でも切れない余白） */}
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, textAlign: "center", transform: "rotate(-3deg)", padding: "0 40px" }}>
        <span style={{ color: "#fff", fontFamily: pop, fontSize: oneLineFont(photoStoryCaption, 920, 64, 2, 30), whiteSpace: "nowrap",
          textShadow: "0 6px 26px rgba(60,30,0,0.5)" }}>{photoStoryCaption}</span>
      </div>
      <Ume x={110} y={330} />
      <Ume x={880} y={210} s={80} />
      <Ume x={130} y={1480} s={56} />
      <Ume x={890} y={1520} />
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: "#fff", fontFamily: pop, fontSize: 30, textShadow: "0 3px 14px rgba(60,30,0,0.6)" }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};

// ── 案G: メニューPOP（集中線×赤極太×縦書き黄マーカー） ──
export const TaishuImgG: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const AKAI = "#e0281e";
  return (
    <AbsoluteFill style={{ background: "repeating-linear-gradient(180deg,#dcbd90 0 6px,#d2b183 6px 150px)" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.28) 0%, rgba(120,80,30,0.22) 100%)" }} />
      {/* 上半分の集中線 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: -960, height: 1920, opacity: 0.5 }}>
        <Shuchusen color="rgba(60,40,20,0.5)" opacity={0.8} />
      </div>
      {/* 右上：屋号ラベル */}
      <div style={{ position: "absolute", top: 120, right: 70, textAlign: "center" }}>
        <div style={{ background: KURO, color: "#fff", fontFamily: goshi, fontSize: 26, letterSpacing: 6, padding: "6px 18px" }}>大衆酒場</div>
        <div style={{ background: KIIRO, border: "3px solid " + KURO, padding: "8px 18px" }}>
          <span style={{ color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 40, letterSpacing: 2 }}>すさび湯三条</span>
        </div>
      </div>
      {/* 見出し（赤極太×白フチ） */}
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <span style={{ color: AKAI, fontFamily: goshi, fontWeight: 800, fontSize: oneLineFont(photoStoryCaption, 940, 84, 2, 40),
          whiteSpace: "nowrap", ...fuchi("#ffffff", 9) }}>{photoStoryCaption}</span>
      </div>
      {/* 写真：全体表示（白フチなしでドン） */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 130 }}>
        <Img src={staticFile(photoStoryPhoto)} style={{ maxWidth: 960, maxHeight: 980, width: "auto", height: "auto",
          filter: "saturate(1.15) contrast(1.05) drop-shadow(0 24px 40px rgba(60,30,0,0.35))" }} />
      </AbsoluteFill>
      {/* 右側：縦書きの黄マーカー文字 */}
      <div style={{ position: "absolute", right: 84, top: 700 }}>
        <span style={{ writingMode: "vertical-rl", background: KIIRO, boxShadow: "0 0 0 8px " + KIIRO,
          color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 46, letterSpacing: 6, lineHeight: 1.2 } as React.CSSProperties}>{pickTag()}</span>
      </div>
      <div style={{ position: "absolute", bottom: 130, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: KURO, fontFamily: goshi, fontWeight: 800, fontSize: 32, letterSpacing: 1 }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
