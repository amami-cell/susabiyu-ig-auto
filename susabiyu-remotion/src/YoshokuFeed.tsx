// 洋食フィード投稿画像テンプレ集（4:5＝1080×1350・静止画）を全面刷新。
// 3人のプロ監査（インフルエンサー／F&B AD／タイポデザイナー）の一致点を反映：
//  ① 料理を主役に（フルブリード or 74%）。料理を小さく額装しない。
//  ② 文字は“ベタ下地の上”で極太（Noto Serif JP Black=minchoBlack）。薄いグラデ頼みにしない。
//  ③ テラコッタは「1枚1焦点」。大面積の塗りは深い #C9542E(slab)、小焦点は #E0673A(accent)。
//  ④ IGグリッドは4:5を中央1:1にクロップ→主役は安全帯 y[150,1200] に収める（上端/下端に核を置かない）。
//  ⑤ 和文＝明朝、ラテン/数字＝Cormorant（欧文専用）。和文をserifで描かない（従来バグの修正）。
//  ⑥ 料理写真は contrast/saturate を足してシズルを立てる。
// 料理名＝disp（16文字以上のみ ｜ で2行、15文字以下は自動フィットで1行）、欧文サブ＝sub（伊語優先）。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { typoPhotos, typoLogoColor } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import { mincho, minchoBlack, serif, Grain, Vignette, WarmGlow, splitLines } from "./yoshokuDesign";

export const FEED_W = 1080;
export const FEED_H = 1350;
export const FEED_DUR = 1; // 静止画（stillで1フレーム抜く）

type P = { storeName?: string; handle?: string; theme?: string };
const D = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };
const SIDE = 64;

function dish() {
  return typoPhotos[0] || { src: "", caption: "", sub: "", story: "", disp: "", desc: "" };
}
function dispName(d: { disp?: string; caption?: string }) {
  return (d.disp && d.disp.length ? d.disp : (d.caption || ""));
}
function jlen(s: string) { return Array.from(s || "").length; }

// 料理写真（肉のシズル用に contrast/saturate を付与）。
const Photo: React.FC<{ src: string; pos?: string; bri?: number; sat?: number; con?: number; style?: React.CSSProperties }> =
  ({ src, pos, bri = 1.02, sat = 1.15, con = 1.10, style }) => (
    <Img src={staticFile(src)} style={{
      width: "100%", height: "100%", objectFit: "cover", objectPosition: pos || "center",
      filter: "brightness(" + bri + ") saturate(" + sat + ") contrast(" + con + ")", ...style,
    }} />
  );

// 幅に合わせて1行に収まるフォントサイズを自動決定（＝“大きさは保ちつつ長い名前は少し詰める”）。
// ｜がある名前は2行として一番長い行で計算する。minPx未満にはしない。
function fitSize(text: string, maxPx: number, usableW: number, minPx = 46) {
  const arr = splitLines(text); const lines = arr.length ? arr : [text];
  const longest = Math.max(1, ...lines.map(jlen));
  return Math.max(minPx, Math.min(maxPx, Math.floor(usableW / longest)));
}

// 欧文サブ（小・Cormorant・大文字）＋極太明朝の料理名。横組み。
const HeroName: React.FC<{
  text: string; sub?: string; maxPx: number; usableW: number; color: string;
  subColor: string; align?: "left" | "center"; shadow?: string; minPx?: number;
}> = ({ text, sub, maxPx, usableW, color, subColor, align = "left", shadow, minPx = 46 }) => {
  const arr = splitLines(text); const lines = arr.length ? arr : [text];
  const size = fitSize(text, maxPx, usableW, minPx);
  const subSize = Math.max(20, Math.min(30, Math.round(size * 0.24)));
  return (
    <div style={{ textAlign: align }}>
      {sub ? (
        <div style={{ fontFamily: serif, color: subColor, fontSize: subSize, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, lineHeight: 1.1, marginBottom: Math.round(size * 0.12), textShadow: shadow }}>{sub}</div>
      ) : null}
      <div style={{ fontFamily: minchoBlack, fontWeight: 900, color, fontSize: size, lineHeight: 1.08, letterSpacing: -1, textShadow: shadow }}>
        {lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};

// 縦組みの極太明朝（案D用）。availHに合わせてサイズを決め、｜は2列（右→左）で描く。
const VName: React.FC<{ text: string; color: string; maxPx: number; availH: number; shadow?: string }> =
  ({ text, color, maxPx, availH, shadow }) => {
    const arr = splitLines(text); const lines = arr.length ? arr : [text];
    const longest = Math.max(1, ...lines.map(jlen));
    const size = Math.max(48, Math.min(maxPx, Math.floor(availH / longest)));
    return (
      <div style={{ display: "flex", flexDirection: "row-reverse", gap: Math.round(size * 0.1) }}>
        {lines.map((l, i) => (
          <div key={i} style={{ writingMode: "vertical-rl", fontFamily: minchoBlack, fontWeight: 900, color, fontSize: size, letterSpacing: -2, lineHeight: 1, textShadow: shadow }}>{l}</div>
        ))}
      </div>
    );
  };

// 店ロゴ（色付き文字ロゴ typoLogoColor があれば大きめに表示。無ければ明朝の店名＝和文serifバグ回避）。
const Logo: React.FC<{ storeName: string; tint?: string; h?: number }> = ({ storeName, tint = "#F6EFE0", h = 132 }) => (
  typoLogoColor
    ? <Img src={staticFile(typoLogoColor)} style={{ height: h, width: "auto", maxWidth: 680, objectFit: "contain", filter: "drop-shadow(0 3px 16px rgba(0,0,0,0.6))" }} />
    : <div style={{ fontFamily: mincho, color: tint, fontSize: Math.round(h * 0.72), fontWeight: 700, letterSpacing: 2, lineHeight: 1, textShadow: "0 3px 16px rgba(0,0,0,0.5)" }}>{storeName}</div>
);

// ブランド・ロックアップ（左上・安全帯内）＝大きめ色付きロゴ＋その下に小さなラテンのキッカー。
const Brand: React.FC<{ storeName: string; accent: string; tint?: string; logoH?: number; kicker?: string; shadow?: string; center?: boolean }> =
  ({ storeName, accent, tint = "#F6EFE0", logoH = 132, kicker = "MEAT BAR", shadow, center = false }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", gap: 10 }}>
      <Logo storeName={storeName} tint={tint} h={logoH} />
      <div style={{ fontFamily: serif, color: accent, fontSize: 20, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, textShadow: shadow }}>{kicker}</div>
    </div>
  );

const Handle: React.FC<{ handle: string; color: string; shadow?: string }> = ({ handle, color, shadow }) => (
  <div style={{ position: "absolute", right: SIDE, bottom: 54, fontFamily: serif, color, fontSize: 24, letterSpacing: 3, textShadow: shadow }}>{handle}</div>
);

const NAME_SHADOW = "0 3px 22px rgba(0,0,0,0.85)";

// 装飾用のワイングラス（線画SVG）。C案の余白埋め・肉バル×ワインの世界観。
const WineGlass: React.FC<{ style?: React.CSSProperties; stroke?: string }> = ({ style, stroke = "#E0673A" }) => (
  <svg viewBox="0 0 60 104" style={style} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 6 h34 v8 c0 13 -8 23 -17 23 s-17 -10 -17 -23 z" />
    <path d="M14 16 c3 7 9 12 16 12 s13 -5 16 -12" strokeWidth={1.5} opacity={0.55} />
    <line x1="30" y1="37" x2="30" y2="90" />
    <line x1="16" y1="97" x2="44" y2="97" />
  </svg>
);

// ①A フルブリード×ボトム暗幕（定番・最強のデフォルト）
export const YoshokuFeedA: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 46%, rgba(18,13,8,0.92) 88%, " + T.footBase + " 100%)" }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 150 }}>
        <div style={{ width: 84, height: 6, background: T.accent, marginBottom: 20 }} />
        <HeroName text={dispName(d)} sub={d.sub} maxPx={150} usableW={FEED_W - SIDE * 2} color={T.ink} subColor={T.accent} shadow={NAME_SHADOW} />
      </div>
      <Handle handle={handle} color={T.sub} shadow={NAME_SHADOW} />
      <WarmGlow /><Vignette strength={0.34} /><Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ②B ボトムバンド・エディトリアル（写真74%＋ベタ帯・清潔で読みやすい）
export const YoshokuFeedB: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.footBase }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1000, overflow: "hidden" }}>
        <Photo src={d.src} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%)" }} />
      </div>
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 1000, bottom: 0, display: "flex", alignItems: "center" }}>
        <div style={{ width: 6, alignSelf: "stretch", background: T.accent, margin: "44px 0" }} />
        <div style={{ marginLeft: 30, flex: 1 }}>
          <HeroName text={dispName(d)} sub={d.sub} maxPx={92} usableW={FEED_W - SIDE * 2 - 36} color={T.ink} subColor={T.accent} />
        </div>
      </div>
      <Handle handle={handle} color={T.sub} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// ③C カラースラブ分割（テラコッタのベタ面＋ノックアウト特大料理名／グリッドで色が殴る）
// 左スラブは flex縦・space-between で「ロゴ／料理名／締め」を均等配置＝下の余白の空きすぎを解消。
// 料理名は minPx を下げて“1行に収める”（狭いスラブでの不格好な2行を防止）。
export const YoshokuFeedC: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const SLAB = 500;
  return (
    <AbsoluteFill style={{ backgroundColor: T.slab }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: SLAB, right: 0, overflow: "hidden" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: SLAB, background: "linear-gradient(160deg, " + T.accent + "1F 0%, " + T.slab + " 42%, " + T.slab + " 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "26px 28px 40px", boxSizing: "border-box" }}>
        <Brand storeName={storeName} accent="#F6EFE0" tint="#F6EFE0" kicker="MEAT BAR" />
        <div>
          <HeroName text={dispName(d)} sub={d.sub} maxPx={92} minPx={34} usableW={SLAB - 56} color="#FDF6EA" subColor="rgba(253,246,234,0.85)" />
          {d.desc ? <div style={{ marginTop: 20, fontFamily: mincho, color: "rgba(253,246,234,0.92)", fontSize: 26, lineHeight: 1.7, letterSpacing: 1 }}>{d.desc}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <WineGlass style={{ width: 54, height: 92, opacity: 0.9 }} stroke="rgba(253,246,234,0.8)" />
          <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.92)", fontSize: 24, letterSpacing: 3 }}>{handle}</span>
        </div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ④D 縦組み特大明朝×ハーフ・シズル（右に料理／左は暖色の濃色パネルに縦組み名）
// 料理を右半分にきっちり寄せて左に余白を作る。左は“真っ黒の暗幕”ではなく暖かい濃茶パネル（不気味さ解消）。
export const YoshokuFeedD: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const PANEL = 424;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      {/* 右：料理（右へ寄せる＝左に余白） */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: PANEL, right: 0, overflow: "hidden" }}>
        <Photo src={d.src} />
        {/* 継ぎ目だけやわらかく馴染ませる（暗くしすぎない） */}
        <AbsoluteFill style={{ background: "linear-gradient(90deg, " + T.base + " 0%, " + T.base + "00 12%)" }} />
      </div>
      {/* 左：暖かい濃色パネル（真っ黒を避ける） */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: PANEL, background: "linear-gradient(155deg, #2d2118 0%, #211710 55%, " + T.base + " 100%)" }} />
      <div style={{ position: "absolute", top: PANEL - 400, left: 0, width: 6, height: 0 }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      {d.sub ? <div style={{ position: "absolute", top: 232, left: 40, fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, maxWidth: PANEL - 80 }}>{d.sub}</div> : null}
      <div style={{ position: "absolute", top: 296, left: 46, height: 900 }}>
        <VName text={dispName(d)} color={T.ink} maxPx={120} availH={900} shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: 40, bottom: 54, fontFamily: serif, color: T.sub, fontSize: 24, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑤E サイドレール・ブランド（全面写真＋左の縦帯＝グリッドの統一シグネチャ）。
// 左オビの色は rail で差し替え可（テラコッタ/オリーブ/ゴールドのパターンを用意）。
const EBase: React.FC<P & { rail: string; railText?: string }> = ({
  storeName = D.storeName, handle = D.handle, theme = D.theme, rail, railText = "#FDF6EA",
}) => {
  const T = ytheme(theme); const d = dish(); const RAIL = 74;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: RAIL, right: 0, overflow: "hidden" }}>
        <Photo src={d.src} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(18,13,8,0.9) 92%, " + T.footBase + " 100%)" }} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: RAIL, background: rail, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: railText, fontSize: 22, letterSpacing: 10, textTransform: "uppercase", fontWeight: 600 }}>NAGAGUTSU&nbsp;·&nbsp;MEAT&nbsp;BAR</div>
      </div>
      <div style={{ position: "absolute", top: 24, left: RAIL + 16 }}>
        <Logo storeName={storeName} h={134} />
      </div>
      <div style={{ position: "absolute", left: RAIL + 40, right: SIDE, bottom: 150 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={140} usableW={FEED_W - RAIL - 40 - SIDE} color={T.ink} subColor="#F0DFC6" shadow={NAME_SHADOW} />
      </div>
      <Handle handle={handle} color={T.sub} shadow={NAME_SHADOW} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuFeedE: React.FC<P> = (p) => <EBase {...p} rail={ytheme(p.theme || D.theme).slab} />;               // テラコッタ
export const YoshokuFeedE2: React.FC<P> = (p) => <EBase {...p} rail="#4E7A3A" />;                                      // オリーブ/イタリアングリーン
export const YoshokuFeedE3: React.FC<P> = (p) => <EBase {...p} rail="#B58A2E" />;                                      // 深めゴールド

// ⑥F テラコッタ・リボン販促（全面写真＋「本日のおすすめ」ベタ帯＝集客の顔）
export const YoshokuFeedF: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 70%, rgba(18,13,8,0.9) 90%, " + T.footBase + " 100%)" }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      {/* 「本日のおすすめ」帯と料理名をぎりぎり下へ＝料理を最大限見せる */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 214, height: 104, background: T.slab, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 40px rgba(0,0,0,0.45)" }}>
        <span style={{ fontFamily: mincho, color: "#FDF6EA", fontSize: 46, fontWeight: 700, letterSpacing: 8 }}>本日のおすすめ</span>
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 52, textAlign: "center" }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={92} usableW={FEED_W - SIDE * 2} color={T.ink} subColor="#F0DFC6" align="center" shadow={NAME_SHADOW} />
      </div>
      <Vignette strength={0.24} /><Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑦G マガジン・エディトリアル（写真74%＋親子罫＋特大料理名・品よく強い）
export const YoshokuFeedG: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.footBase }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 940, overflow: "hidden" }}>
        <Photo src={d.src} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 82%, " + T.footBase + " 100%)" }} />
      </div>
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 966 }}>
        <div style={{ height: 3, background: T.accent, marginBottom: 4 }} />
        <div style={{ height: 1, background: T.line, marginBottom: 20, opacity: 0.7 }} />
        <HeroName text={dispName(d)} sub={d.sub} maxPx={96} usableW={FEED_W - SIDE * 2} color={T.ink} subColor={T.accent} />
      </div>
      <Handle handle={handle} color={T.sub} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// ── H系＝「切り抜き風」提案（デザイナー3案の合議）───────────────────────────
//  依頼：料理を“切り抜き”に／背景を真っ暗から変更／複数パターン。
//  制約：本パイプラインに背景除去(bg-removal)は無い＝長方形写真しか無い。
//  → 3人の見解：「丸/角丸マスク＋クリーム縁＋落ち影」で“シールを貼った切り抜き感”を作る。
//    背景は真っ黒をやめ、温かいパーチメント/テラコッタ地に。以下3案。
const CREAM = "#F3E7CF";      // パーチメント地
const CREAM_D = "#E9D6B4";    // その陰
const INK_D = "#241A12";      // 濃い焦茶（明るい地の上の文字）

// ⑧H パーチメント×角丸カード（切り抜き風・温かい紙地に料理カードが浮く）
export const YoshokuFeedH: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  const ghost = (d.sub || "MEAT BAR").split(" ")[0];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 34%, " + CREAM + " 0%, " + CREAM_D + " 100%)" }}>
      {/* 薄いゴースト欧文（紙の透かし） */}
      <div style={{ position: "absolute", top: 300, left: -20, right: -20, textAlign: "center", fontFamily: serif, fontStyle: "italic", fontWeight: 600, color: T.accent, opacity: 0.1, fontSize: 300, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{ghost}</div>
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Brand storeName={storeName} accent={T.slab} tint={INK_D} logoH={124} center />
      </div>
      {/* 角丸カード＝“切り抜き風”。クリーム縁＋濃い落ち影で紙から浮かせる */}
      <div style={{ position: "absolute", left: 116, right: 116, top: 372, height: 636, borderRadius: 40, overflow: "hidden", border: "10px solid #FBF3E2", boxShadow: "0 34px 66px rgba(60,30,12,0.34)" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 1046 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={86} usableW={FEED_W - SIDE * 2} color={INK_D} subColor={T.slab} align="center" />
      </div>
      <div style={{ position: "absolute", right: SIDE, bottom: 54, fontFamily: serif, color: "rgba(36,26,18,0.6)", fontSize: 24, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑧H2 丸皿カット（正円マスク＝“お皿を切り抜いた”感・テラコッタ地に大きく1点）
export const YoshokuFeedH2: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  const ghost = (d.sub || "MEAT BAR").split(" ")[0];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(115% 85% at 50% 40%, " + T.accent + " 0%, " + T.slab + " 55%, " + T.base + " 100%)" }}>
      <div style={{ position: "absolute", top: 356, left: -20, right: -20, textAlign: "center", fontFamily: serif, fontStyle: "italic", fontWeight: 700, color: "#FDF6EA", opacity: 0.12, fontSize: 260, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{ghost}</div>
      <div style={{ position: "absolute", top: 104, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Brand storeName={storeName} accent="#FDF6EA" tint="#FDF6EA" logoH={124} center shadow={NAME_SHADOW} />
      </div>
      {/* 正円マスク＝丸皿の切り抜き。二重リングで立体感 */}
      <div style={{ position: "absolute", left: 130, top: 386, width: 820, height: 820, borderRadius: "50%", overflow: "hidden", border: "12px solid rgba(253,246,234,0.92)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
        <Photo src={d.src} bri={1.05} sat={1.18} con={1.12} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 96 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={90} usableW={FEED_W - SIDE * 2} color="#FDF6EA" subColor="rgba(253,246,234,0.85)" align="center" shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 54, textAlign: "center", fontFamily: serif, color: "rgba(253,246,234,0.8)", fontSize: 24, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑧H3 角丸ステッカー×ハーフ地（クリーム／テラコッタ2分割＋傾けたカット＝雑誌の切り抜き）
export const YoshokuFeedH3: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      {/* 下半分をテラコッタのベタ面に（2分割） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 540, background: T.slab }} />
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Brand storeName={storeName} accent={T.slab} tint={INK_D} logoH={120} center />
      </div>
      {/* 角丸ステッカー＝切り抜き風。わずかに傾けて“貼った”感、クリーム縁＋落ち影 */}
      <div style={{ position: "absolute", left: 190, top: 320, width: 700, height: 700, borderRadius: 60, overflow: "hidden", border: "12px solid #FBF3E2", boxShadow: "0 36px 70px rgba(40,20,8,0.4)", transform: "rotate(-4deg)" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 96, textAlign: "center" }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={84} usableW={FEED_W - SIDE * 2} color="#FDF6EA" subColor="rgba(253,246,234,0.85)" align="center" shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, textAlign: "center", fontFamily: serif, color: "rgba(253,246,234,0.8)", fontSize: 24, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

export const FEED_COMPS: { id: string; label: string; comp: React.FC<P> }[] = [
  { id: "YoshokuFeedA", label: "フィード案A・フルブリード×ボトム暗幕(定番)", comp: YoshokuFeedA },
  { id: "YoshokuFeedB", label: "フィード案B・ボトムバンド・エディトリアル", comp: YoshokuFeedB },
  { id: "YoshokuFeedC", label: "フィード案C・カラースラブ分割(テラコッタ面)", comp: YoshokuFeedC },
  { id: "YoshokuFeedD", label: "フィード案D・縦組み特大明朝", comp: YoshokuFeedD },
  { id: "YoshokuFeedE", label: "フィード案E・サイドレール(テラコッタ帯)", comp: YoshokuFeedE },
  { id: "YoshokuFeedE2", label: "フィード案E2・サイドレール(オリーブ帯)", comp: YoshokuFeedE2 },
  { id: "YoshokuFeedE3", label: "フィード案E3・サイドレール(ゴールド帯)", comp: YoshokuFeedE3 },
  { id: "YoshokuFeedF", label: "フィード案F・テラコッタ帯(本日のおすすめ)", comp: YoshokuFeedF },
  { id: "YoshokuFeedG", label: "フィード案G・マガジン・エディトリアル", comp: YoshokuFeedG },
  { id: "YoshokuFeedH", label: "フィード案H・パーチメント×角丸カード(切り抜き風)", comp: YoshokuFeedH },
  { id: "YoshokuFeedH2", label: "フィード案H2・丸皿カット(正円・テラコッタ地)", comp: YoshokuFeedH2 },
  { id: "YoshokuFeedH3", label: "フィード案H3・角丸ステッカー×ハーフ地", comp: YoshokuFeedH3 },
];
