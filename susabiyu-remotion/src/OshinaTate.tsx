import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { kanjiNum } from "./fit";

const { fontFamily: mincho } = loadFont();
const PAPER = "#efe7d6";
const INK = "#2a241c";
const SEAL = "#b4402f";
const GOLD = "#d8b25a";
const SUB = "#8a7e6c";

// お品書き(四コマ風)。写真を大きく2×2グリッドで見せ、各コマに縦書きの料理名を載せる。
const GAP = 22;
const PAD = 74;
const GRID_TOP = 236;
const GRID_BOTTOM = 1664;     // この下に屋号
const COLS = 2;
const INTRO = 40;
const STEP = 40;              // 1コマずつ出る間隔
const HOLD = 90;
const N = typoPhotos.length;
const ROWS = Math.max(1, Math.ceil(N / COLS));
const CW = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CH = (GRID_BOTTOM - GRID_TOP - GAP * (ROWS - 1)) / ROWS;
const TOTAL = INTRO + N * STEP + HOLD;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 料理名が長い時に縦書き2列へ折り返す。段落(割れ位置)が不自然にならないよう:
//   ①空白があればそこで割る ②メニュー語尾(焼き/揚げ/うどん/コロッケ/フライ/巻き/餃子…)の
//   手前で割る ③漢字/かな/カタカナの境目を優先 ④カタカナ語の途中では割らない ⑤小文字(ー・ッ等)で
//   列頭を始めない ⑥なるべく中央。辞書は使わず語尾リスト＋文字種のヒューリスティック。
const _SMALL = "ーャュョッンァィゥェォ・ぁぃぅぇぉっゃゅょゎん々ゝヽｰ";
const _SUF = ["焼きおにぎり","おにぎり","焼きそば","うどん","そば","コロッケ","フライ","サラダ",
  "スライス","キャベツ","チーズ巻き","チーズ","コース","セット","ライス","カレー","バター","ぽん酢",
  "唐揚げ","天ぷら","たまご","焼売","餃子","巻き","揚げ","炒め","漬け","焼き","盛り","煮","造り",
  "団子","わさび","合わせ"];
const _scr = (c: string): string => {
  const o = c.charCodeAt(0);
  if (o >= 0x3040 && o <= 0x309F) return "H";
  if (o >= 0x30A0 && o <= 0x30FF) return "K";
  if (o >= 0x4E00 && o <= 0x9FFF) return "J";
  return "O";
};
const wrapDish = (nm: string, max: number): string => {
  if (!max || !nm || nm.length <= max) return nm;
  const sp = nm.search(/[ \u3000]/);
  if (sp > 0) {
    const a = nm.slice(0, sp).replace(/[ \u3000]+$/, "");
    const b = nm.slice(sp + 1).replace(/^[ \u3000]+/, "");
    if (a && b) return a + "\n" + b;
  }
  const n = nm.length, mid = n / 2;
  let best = -1, bs = -1e9;
  for (let i = 2; i <= n - 2; i++) {
    if (_SMALL.indexOf(nm[i]) >= 0) continue;
    const issuf = _SUF.some((s) => nm.slice(i) === s);
    let sc = -Math.abs(i - mid);
    if (_scr(nm[i - 1]) !== _scr(nm[i])) sc += 1;
    if (issuf) sc += 3;
    if (!issuf && _scr(nm[i - 1]) === "K" && _scr(nm[i]) === "K") sc -= 5;
    if (sc > bs) { bs = sc; best = i; }
  }
  if (best < 0) best = Math.ceil(n / 2);
  return nm.slice(0, best) + "\n" + nm.slice(best);
};

export const OshinaTate: React.FC<{ storeName?: string; handle?: string; region?: string; regionScale?: number; nameSize?: number; nameWrap?: number }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo", region = "京都・河原町三条", regionScale = 1, nameSize = 40, nameWrap = 0 }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [4, 20], [0, 1], clamp);
  const ruleW = interpolate(f, [12, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.ease) });
  const sealO = interpolate(f, [8, 24], [0, 1], clamp);
  const footO = interpolate(f, [10, 26], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 16, TOTAL - 22, TOTAL], [0, 0.8, 0.8, 0], clamp)} />
      {/* 和紙の地＋外枠 */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 30% 18%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%), radial-gradient(60% 50% at 80% 90%, rgba(160,140,100,0.15), rgba(160,140,100,0) 60%)" }} />
      <div style={{ position: "absolute", top: 52, left: 52, right: 52, bottom: 52, border: "2px solid rgba(42,36,28,0.3)" }} />

      {/* 表題 */}
      <div style={{ position: "absolute", top: 96, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 60, letterSpacing: 16 }}>お品書き</div>
        <div style={{ width: (ruleW * 240) + "px", height: 2, backgroundColor: SEAL, margin: "16px auto 0" }} />
      </div>
      {/* 落款 */}
      <div style={{ position: "absolute", top: 128, right: 104, width: 62, height: 62, borderRadius: 8, border: "3px solid " + SEAL, color: SEAL, fontFamily: mincho, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", opacity: sealO }}>旬</div>

      {/* 四コマ：大きな写真＋縦書きの料理名（右上→左、上→下の順） */}
      {typoPhotos.map((p, i) => {
        const col = i % COLS;            // 右から（一を右上に）
        const row = Math.floor(i / COLS);
        const x = PAD + (COLS - 1 - col) * (CW + GAP);
        const y = GRID_TOP + row * (CH + GAP);
        const a = INTRO + i * STEP;
        const o = interpolate(f, [a, a + 16], [0, 1], clamp);
        const s = interpolate(f, [a, a + 20], [0.93, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const name = kanjiNum(p.caption);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: CW, height: CH, opacity: o, transform: "scale(" + s + ")", borderRadius: 14, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 16px 36px rgba(0,0,0,0.28)", backgroundColor: "#000" }}>
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* 縦書きの名札（写真の上に） */}
            <div style={{ position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 12px", borderRadius: 10, background: "rgba(20,16,12,0.5)" }}>
              <span style={{ color: GOLD, fontFamily: mincho, fontSize: 26, marginBottom: 10 }}>{KAN[i] || (i + 1)}</span>
              <span style={{ color: "#fff", fontFamily: mincho, fontWeight: 600, fontSize: nameSize, letterSpacing: 3, writingMode: "vertical-rl", whiteSpace: "pre-wrap", textAlign: "center", lineHeight: 1.05, textShadow: "0 2px 8px rgba(0,0,0,0.6)" } as React.CSSProperties}>{wrapDish(name, nameWrap)}</span>
            </div>
          </div>
        );
      })}

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 96, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontSize: 32, letterSpacing: 6, marginBottom: 8 }}>{storeName}</div>
        <div style={{ color: SUB, fontFamily: mincho, fontSize: 24, letterSpacing: 4 }}><span style={{ fontSize: Math.round(24 * regionScale) }}>{region}</span>　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
