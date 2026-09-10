// 洋食⑪雑誌ストーリーの「商品ページ」デザイン提案（1080×1920・静止画）。
// 本編4ページの組み方をオーナーが選べるように、同じ料理・同じ紙で10案を並べて比較できるようにする。
// 選ばれた案（＋修正指示）を YoshokuMagazine.tsx の PageA〜D に反映する運用。
//
// 全案で共通なのは「紙の地・二重罫・柱(誌名)・ノンブル・奥付帯」＝“一冊の雑誌”に見せる器。
// 変えているのは中身の組み方だけ。静止画なのでアニメは持たない（動きは採用後に付ける）。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { typoPhotos } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import { mincho, serif, splitLines } from "./yoshokuDesign";

export const MAGP_W = 1080;
export const MAGP_H = 1920;
export const MAGP_DUR = 1;

const PAPER = "#F3E7CF";
const PAPER_D = "#E7D5B2";
const INK = "#241A12";
const INK_SOFT = "rgba(36,26,18,0.82)";
const CARD = "#FBF5E9";

type P = { storeName?: string; handle?: string; theme?: string };
const D = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };

const EMPTY = { src: "", caption: "", sub: "", disp: "", desc: "" };
function dishes(n: number) {
  const p: any[] = typoPhotos.length ? (typoPhotos as any[]) : [EMPTY];
  return Array.from({ length: n }, (_, i) => p[i] || p[p.length - 1]);
}
function nameOf(d: any) {
  return String((d.disp && d.disp.length ? d.disp : d.caption) || "").replace(/[｜\n]/g, "");
}
function jlen(s: string) { return Array.from(s || "").length; }

// 和文を枠幅に1行で収めるサイズ
function fitJa(text: string, maxPx: number, usableW: number, minPx = 22) {
  return Math.max(minPx, Math.min(maxPx, Math.floor(usableW / Math.max(1, jlen(text)))));
}
// 欧文（Cormorant大文字＋字送り）を枠幅に1行で収めるサイズ
function fitEn(text: string, maxPx: number, usableW: number, ls = 6, minPx = 14) {
  const n = Math.max(1, (text || "").length);
  return Math.max(minPx, Math.min(maxPx, Math.floor((usableW / n - ls) / 0.55)));
}

const Photo: React.FC<{ src?: string; style?: React.CSSProperties; pos?: string }> = ({ src, style, pos }) =>
  src ? (
    <Img src={staticFile(src)} style={{
      width: "100%", height: "100%", objectFit: "cover", objectPosition: pos || "center",
      filter: "brightness(1.06) saturate(1.12) contrast(1.04)", ...style,
    }} />
  ) : null;

// 誌面の器（紙・二重罫・柱・ノンブル・奥付帯）。全案で共通。
const Sheet: React.FC<{ storeName: string; handle: string; label: string; slab: string; no: string; children: React.ReactNode }> =
  ({ storeName, handle, label, slab, no, children }) => (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 34%, " + PAPER + " 0%, " + PAPER_D + " 100%)", fontFamily: mincho }}>
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      <div style={{ position: "absolute", inset: 44, border: "2px solid rgba(150,110,70,0.4)" }} />
      <div style={{ position: "absolute", inset: 60, border: "1px solid rgba(150,110,70,0.26)" }} />
      <div style={{ position: "absolute", top: 118, left: 116, right: 116, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: serif, color: slab, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: serif, color: slab, fontSize: 24, letterSpacing: 4 }}>{no} / 04</span>
      </div>
      <div style={{ position: "absolute", top: 158, left: 116, right: 116, height: 1, background: "rgba(176,72,31,0.4)" }} />
      {children}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: slab }} />
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: mincho, color: "#FDF6EA", fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>{storeName}</span>
        <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 4 }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );

const Kick: React.FC<{ t?: string; c: string; w: number; size?: number; align?: "left" | "center" | "right" }> =
  ({ t, c, w, size = 26, align = "left" }) => (t ? (
    <div style={{ fontFamily: serif, color: c, fontSize: fitEn(t, size, w), letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap", textAlign: align }}>{t}</div>
  ) : null);

const Body: React.FC<{ t?: string; w: number; max?: number; align?: "left" | "center"; color?: string }> =
  ({ t, w, max = 34, align = "left", color = INK_SOFT }) => (t ? (
    <div style={{ fontFamily: mincho, color, letterSpacing: 1, lineHeight: 1.5, textAlign: align, fontSize: fitJa(t.split(/[｜\n]/).sort((a, b) => b.length - a.length)[0] || t, max, w, 20) }}>
      {splitLines(t).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
    </div>
  ) : null);

// 各案は「器の中身」だけを返す
type Inner = (a: { d: any; d2: any; slab: string; accent: string }) => React.ReactNode;

// ── 案01 グラビア扉：大判の裁ち落とし写真＋下端に食い込むクリームの短冊 ──
const P01: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", left: 88, right: 88, top: 236, height: 1120, overflow: "hidden", boxShadow: "0 30px 70px rgba(60,35,14,0.34)" }}><Photo src={d.src} /></div>
  <div style={{ position: "absolute", left: 88, width: 700, top: 1176, background: CARD, padding: "26px 34px 30px", boxShadow: "0 18px 44px rgba(60,35,14,0.30)" }}>
    <Kick t={d.sub} c={slab} w={700 - 68} />
    <div style={{ marginTop: 8, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 66, 700 - 68, 26), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
  </div>
  <div style={{ position: "absolute", left: 88, right: 88, top: 1466 }}>
    <div style={{ width: 96, height: 3, background: slab, marginBottom: 18 }} />
    <Body t={d.desc} w={1080 - 176} />
  </div>
</>);

// ── 案02 左右分割：右に縦長の写真、左に縦組みの料理名 ──
const P02: Inner = ({ d, slab }) => {
  const nm = nameOf(d); const availH = 880;
  const v = Math.max(30, Math.min(78, Math.floor(availH / Math.max(1, jlen(nm)))));
  return (<>
    {/* 写真の左端 452→320。縦組みの料理名がいちばん張り出すケース(x=270)から
        50pxのすき間を残した位置。幅 540→672px。 */}
    <div style={{ position: "absolute", left: 320, right: 88, top: 248, height: 1140, overflow: "hidden", boxShadow: "0 28px 64px rgba(60,35,14,0.32)" }}><Photo src={d.src} /></div>
    <div style={{ position: "absolute", left: 150, top: 268, height: availH, display: "flex", alignItems: "flex-start", gap: 18 }}>
      <div style={{ writingMode: "vertical-rl", fontFamily: mincho, color: INK, fontSize: v, fontWeight: 700, letterSpacing: 4, lineHeight: 1 }}>{nm}</div>
      <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: slab, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, marginTop: 6 }}>{d.sub || ""}</div>
    </div>
    <div style={{ position: "absolute", left: 150, top: 1180, width: 140, height: 3, background: slab }} />
    <div style={{ position: "absolute", left: 116, right: 116, top: 1450 }}><Body t={d.desc} w={1080 - 232} /></div>
  </>);
};

// ── 案03 円形トリミング：特大ノンブルの透かし＋丸く抜いた写真 ──
const P03: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: serif, fontStyle: "italic", fontWeight: 600, color: slab, opacity: 0.09, fontSize: 460, lineHeight: 1 }}>01</div>
  <div style={{ position: "absolute", left: 175, top: 318, width: 730, height: 730, borderRadius: "50%", overflow: "hidden", border: "12px solid " + CARD, boxShadow: "0 34px 74px rgba(60,35,14,0.34)" }}><Photo src={d.src} /></div>
  <div style={{ position: "absolute", left: 116, right: 116, top: 1140, textAlign: "center" }}>
    <Kick t={d.sub} c={slab} w={1080 - 232} align="center" />
    <div style={{ marginTop: 10, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 76, 1080 - 232, 28), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 96, height: 3, background: slab, margin: "22px auto 20px" }} />
    <Body t={d.desc} w={1080 - 232} align="center" />
  </div>
</>);

// ── 案04 白フチ写真：誌面に写真を貼った定番のキャプションページ ──
const P04: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", left: 116, right: 116, top: 248, height: 800 }}>
    <div style={{ position: "absolute", inset: 0, background: CARD, padding: 18, boxShadow: "0 26px 60px rgba(60,35,14,0.30)" }}>
      <div style={{ position: "absolute", inset: 18, overflow: "hidden" }}><Photo src={d.src} /></div>
    </div>
  </div>
  <div style={{ position: "absolute", left: 116, right: 116, top: 1116 }}>
    <Kick t={d.sub} c={slab} w={1080 - 232} />
    <div style={{ marginTop: 10, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 74, 1080 - 232, 28), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 96, height: 3, background: slab, margin: "22px 0 20px" }} />
    <Body t={d.desc} w={1080 - 232} />
  </div>
</>);

// ── 案05 上下二分：写真を上半分に裁ち落とし、下半分を本文の白場に ──
const P05: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", left: 0, right: 0, top: 178, height: 940, overflow: "hidden" }}><Photo src={d.src} /></div>
  <div style={{ position: "absolute", left: 0, right: 0, top: 1118, bottom: 104, background: CARD }} />
  <div style={{ position: "absolute", left: 0, right: 0, top: 1118, height: 5, background: slab }} />
  <div style={{ position: "absolute", left: 116, right: 116, top: 1194 }}>
    <Kick t={d.sub} c={slab} w={1080 - 232} />
    <div style={{ marginTop: 14, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 82, 1080 - 232, 30), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 120, height: 3, background: slab, margin: "26px 0 22px" }} />
    <Body t={d.desc} w={1080 - 232} max={36} />
  </div>
</>);

// ── 案06 大見出し主役：特大の料理名を上に据え、写真は下に大きく一枚 ──
const P06: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", left: 116, right: 116, top: 236 }}>
    <Kick t={d.sub} c={slab} w={1080 - 232} size={30} />
    <div style={{ marginTop: 18, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 108, 1080 - 232, 34), fontWeight: 700, letterSpacing: 1, lineHeight: 1.12, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 1080 - 232, height: 3, background: slab, margin: "30px 0 26px" }} />
    <Body t={d.desc} w={1080 - 232} max={36} />
  </div>
  <div style={{ position: "absolute", left: 116, right: 116, top: 760, height: 1000, overflow: "hidden", boxShadow: "0 28px 64px rgba(60,35,14,0.32)" }}><Photo src={d.src} /></div>
</>);

// ── 案07 全面写真＋角の小札：写真を紙いっぱいに敷き、右下に小さなキャプション札 ──
const P07: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", inset: 60, overflow: "hidden" }}><Photo src={d.src} /></div>
  <div style={{ position: "absolute", right: 92, bottom: 168, width: 640, background: CARD, padding: "24px 30px 28px", boxShadow: "0 20px 50px rgba(60,35,14,0.40)" }}>
    <Kick t={d.sub} c={slab} w={640 - 60} size={22} />
    <div style={{ marginTop: 8, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 54, 640 - 60, 24), fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 72, height: 3, background: slab, margin: "16px 0 14px" }} />
    <Body t={d.desc} w={640 - 60} max={26} />
  </div>
</>);

// ── 案08 二枚組：主役の大判＋ディテールの小さな一枚を重ねる ──
const P08: Inner = ({ d, d2, slab }) => (<>
  <div style={{ position: "absolute", left: 116, right: 240, top: 236, height: 880, overflow: "hidden", boxShadow: "0 28px 64px rgba(60,35,14,0.32)" }}><Photo src={d.src} /></div>
  <div style={{ position: "absolute", right: 96, top: 820, width: 340, height: 340, background: CARD, padding: 14, boxShadow: "0 22px 52px rgba(60,35,14,0.38)" }}>
    <div style={{ position: "absolute", inset: 14, overflow: "hidden" }}><Photo src={(d2 && d2.src) || d.src} /></div>
  </div>
  <div style={{ position: "absolute", left: 116, right: 116, top: 1250 }}>
    <Kick t={d.sub} c={slab} w={1080 - 232} />
    <div style={{ marginTop: 12, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 78, 1080 - 232, 28), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 96, height: 3, background: slab, margin: "24px 0 20px" }} />
    <Body t={d.desc} w={1080 - 232} />
  </div>
</>);

// ── 案09 縦帯レイアウト：左にテラコッタの縦帯（欧文）、右に写真と本文 ──
const P09: Inner = ({ d, slab }) => (<>
  <div style={{ position: "absolute", left: 60, top: 60, bottom: 104, width: 132, background: slab, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: "#FDF6EA", fontSize: 30, letterSpacing: 14, textTransform: "uppercase", fontWeight: 600 }}>{d.sub || "SIGNATURE"}</div>
  </div>
  <div style={{ position: "absolute", left: 236, right: 88, top: 236, height: 900, overflow: "hidden", boxShadow: "0 26px 60px rgba(60,35,14,0.32)" }}><Photo src={d.src} /></div>
  <div style={{ position: "absolute", left: 236, right: 88, top: 1200 }}>
    <div style={{ fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 72, 1080 - 236 - 88, 28), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    <div style={{ width: 96, height: 3, background: slab, margin: "22px 0 20px" }} />
    <Body t={d.desc} w={1080 - 236 - 88} />
  </div>
</>);

// ── 案10 引用主役：大きな鉤括弧で説明文を“引用”として立て、写真は帯状に ──
const P10: Inner = ({ d, slab }) => {
  const q = splitLines(d.desc || "")[0] || nameOf(d);
  return (<>
    <div style={{ position: "absolute", left: 116, right: 116, top: 250 }}>
      <div style={{ fontFamily: mincho, color: slab, fontSize: 150, lineHeight: 0.8, opacity: 0.5 }}>「</div>
      <div style={{ marginTop: -10, fontFamily: mincho, color: INK, fontSize: fitJa(q, 70, 1080 - 232, 28), fontWeight: 700, letterSpacing: 2, lineHeight: 1.5 }}>
        {splitLines(d.desc || q).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
      </div>
      <div style={{ textAlign: "right", fontFamily: mincho, color: slab, fontSize: 150, lineHeight: 0.6, opacity: 0.5 }}>」</div>
    </div>
    {/* 写真の上端 830→640（下端1470は据え置き）。引用が終わるのは約555なので
        85pxの余白を残して、その下の空きを写真で埋める。高さ 640→830px。 */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, height: 830, overflow: "hidden" }}><Photo src={d.src} /></div>
    <div style={{ position: "absolute", left: 116, right: 116, top: 1530, textAlign: "center" }}>
      <Kick t={d.sub} c={slab} w={1080 - 232} align="center" />
      <div style={{ marginTop: 10, fontFamily: mincho, color: INK, fontSize: fitJa(nameOf(d), 68, 1080 - 232, 26), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap" }}>{nameOf(d)}</div>
    </div>
  </>);
};

const INNERS: Inner[] = [P01, P02, P03, P04, P05, P06, P07, P08, P09, P10];
const LABELS = [
  "案01 グラビア扉（大判＋短冊見出し）",
  "案02 左右分割（縦組みの料理名）",
  "案03 円形トリミング（特大ノンブル）",
  "案04 白フチ写真（定番キャプション）",
  "案05 上下二分（下半分を白場に）",
  "案06 大見出し主役（名前を最上部に特大）",
  "案07 全面写真＋角の小札",
  "案08 二枚組（主役＋ディテール）",
  "案09 縦帯レイアウト（左にテラコッタ帯）",
  "案10 引用主役（説明文を鉤括弧で立てる）",
];

function make(i: number): React.FC<P> {
  const Inner = INNERS[i];
  const C: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
    const T = ytheme(theme);
    const [d, d2] = dishes(2);
    return (
      <Sheet storeName={storeName} handle={handle} label={T.label} slab={T.slab} no="01">
        {Inner({ d, d2, slab: T.slab, accent: T.accent })}
      </Sheet>
    );
  };
  return C;
}

export const MAGP_COMPS: { id: string; label: string; comp: React.FC<P> }[] =
  INNERS.map((_, i) => ({
    id: "MagPage" + String(i + 1).padStart(2, "0"),
    label: LABELS[i],
    comp: make(i),
  }));
