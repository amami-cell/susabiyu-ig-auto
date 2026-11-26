// 大衆・壁の短冊：烏丸「お品書き(縦書き)」(OshinaTate)のコマ送り構成そのままに、
// 和紙の誌面 → 居酒屋の木壁に短冊メニュー札がパタパタ貼られていく見せ方へ。
// 提灯・祭りの道具は使わない（木壁×短冊で世界観を分ける）。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { typoPhotos, typoUptempo } from "./typoData";
import { kanjiNum } from "./fit";
import { AKA, KURO, SHIRO, Tex, Spot, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const GAP = 22;
const PAD = 74;
const GRID_TOP = 236;
const GRID_BOTTOM = 1664;
const COLS = 2;
const INTRO = 40;
const STEP = 40;
const HOLD = 90;
const N = typoPhotos.length;
const ROWS = Math.max(1, Math.ceil(N / COLS));
const CW = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CH = (GRID_BOTTOM - GRID_TOP - GAP * (ROWS - 1)) / ROWS;
export const TTAN_DUR = INTRO + N * STEP + HOLD;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 居酒屋の木壁（板目＋灯り）
const KabeBg: React.FC = () => (
  <AbsoluteFill style={{ background: "repeating-linear-gradient(180deg, #5d3c22 0 4px, #4e3019 4px 176px, #3f2612 176px 180px)" }}>
    <Tex opacity={0.2} blend="multiply" />
    <Spot x="50%" y="-4%" color="255,200,130" opacity={0.26} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,4,0.4) 100%)" }} />
  </AbsoluteFill>
);

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

export const TaishuTanzaku: React.FC<{ storeName?: string; handle?: string; region?: string; regionScale?: number; nameSize?: number; nameWrap?: number }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo", region = "京都・河原町三条", regionScale = 1, nameSize = 40, nameWrap = 0 }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [4, 18], [0, 1], clamp);
  const titleS = interpolate(f, [4, 14], [1.7, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sealS = interpolate(f, [14, 19], [2.4, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const sealO = f >= 14 ? 1 : 0;
  const footO = interpolate(f, [10, 26], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#4e3019" }}>
      <Audio src={staticFile(typoUptempo)} volume={(ff) => interpolate(ff, [0, 16, TTAN_DUR - 22, TTAN_DUR], [0, 0.85, 0.85, 0], clamp)} />
      <KabeBg />

      {/* 表題：白木の看板 */}
      <div style={{ position: "absolute", top: 84, left: 0, width: "100%", textAlign: "center", opacity: titleO }}>
        <div style={{ display: "inline-block", background: "linear-gradient(180deg,#efe3c8,#e0cda4)", border: "4px solid #3a2412",
          borderRadius: 8, padding: "14px 60px", transform: "rotate(-1deg) scale(" + titleS + ")", boxShadow: "0 10px 26px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#3a2412", fontFamily: fude, fontSize: 58, letterSpacing: 8 }}>本日のおしながき</span>
        </div>
      </div>
      {/* 旨の赤ハンコがドン */}
      <div style={{ position: "absolute", top: 96, right: 84, transform: "rotate(9deg) scale(" + sealS + ")", opacity: sealO }}>
        <div style={{ width: 104, height: 104, borderRadius: "50%", border: "6px solid " + AKA, background: "rgba(250,242,226,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
          <span style={{ color: AKA, fontFamily: fude, fontSize: 56 }}>旨</span>
        </div>
      </div>

      {/* コマ：写真札（白木フチ）＋縦書き短冊がパタッと貼られる */}
      {typoPhotos.map((p, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + (COLS - 1 - col) * (CW + GAP);
        const y = GRID_TOP + row * (CH + GAP);
        const a = INTRO + i * STEP;
        const o = interpolate(f, [a, a + 10], [0, 1], clamp);
        const s = interpolate(f, [a, a + 12], [1.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const deg = i % 2 === 0 ? -2 : 2;
        const name = kanjiNum(p.caption);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: CW, height: CH, opacity: o,
            transform: "scale(" + s + ") rotate(" + deg + "deg)" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", border: "7px solid #efe3c8",
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)", backgroundColor: "#000" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.12) contrast(1.04)" }} />
            </div>
            {/* 釘留めの短冊（縦書き） */}
            <div style={{ position: "absolute", top: -14, right: 10, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "18px 12px 20px", background: "linear-gradient(180deg,#f6eeda,#eaddbd)", border: "3px solid #3a2412", borderRadius: 4,
              boxShadow: "4px 6px 14px rgba(0,0,0,0.45)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2c1c0c", marginBottom: 10, boxShadow: "inset 0 2px 3px rgba(255,255,255,0.4)" }} />
              <span style={{ color: AKA, fontFamily: fude, fontSize: 24, marginBottom: 8 }}>{KAN[i] || (i + 1)}</span>
              <span style={{ color: "#2c1c0c", fontFamily: fude, fontSize: nameSize, letterSpacing: 2, writingMode: "vertical-rl", whiteSpace: "pre-wrap", textAlign: "center", lineHeight: 1.05 } as React.CSSProperties}>{wrapDish(name, nameWrap)}</span>
            </div>
          </div>
        );
      })}

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 78, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: SHIRO, fontFamily: fude, fontSize: 40, letterSpacing: 4, marginBottom: 10, ...fuchi(KURO, 5) }}>{storeName}</div>
        <div style={{ color: SHIRO, fontFamily: goshi, fontSize: 26, letterSpacing: 2, ...fuchi(KURO, 4) }}><span style={{ fontSize: Math.round(26 * regionScale) }}>{region}</span>　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
