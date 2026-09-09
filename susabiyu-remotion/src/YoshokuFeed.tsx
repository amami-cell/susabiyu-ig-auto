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

// モルタル（塗り壁/コンクリート）色。真っ黒を避けた“少し明るい黒”。B・G の下地に使う。
const MORTAR = "#33302C";
const MORTAR_HI = "#3C3833";
const MORTAR_LO = "#2A2723";

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
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 128 }}>
        <div style={{ width: 84, height: 6, background: T.accent, marginBottom: 20 }} />
        <HeroName text={dispName(d)} sub={d.sub} maxPx={150} usableW={FEED_W - SIDE * 2} color={T.ink} subColor={T.accent} shadow={NAME_SHADOW} />
        {d.desc ? <div style={{ marginTop: 18, fontFamily: mincho, color: "#E7DAC2", fontSize: 30, lineHeight: 1.6, letterSpacing: 1, textShadow: NAME_SHADOW }}>{d.desc}</div> : null}
      </div>
      <Handle handle={handle} color={T.sub} shadow={NAME_SHADOW} />
      <WarmGlow /><Vignette strength={0.34} /><Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ②B ボトムバンド・エディトリアル（写真＋モルタル色のベタ帯・清潔で読みやすい）
// 下の帯は“真っ黒”をやめ、少し明るいモルタル(コンクリート)色に。料理説明も帯の中へ。
export const YoshokuFeedB: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: MORTAR }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 940, overflow: "hidden" }}>
        <Photo src={d.src} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%)" }} />
      </div>
      {/* モルタル帯（微かな粒状ムラで“塗り壁”の質感） */}
      <div style={{ position: "absolute", top: 940, left: 0, right: 0, bottom: 0, background: "linear-gradient(180deg, " + MORTAR_HI + " 0%, " + MORTAR + " 60%, " + MORTAR_LO + " 100%)" }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 986, display: "flex" }}>
        <div style={{ width: 6, background: T.accent, alignSelf: "stretch" }} />
        <div style={{ marginLeft: 28, flex: 1 }}>
          <HeroName text={dispName(d)} sub={d.sub} maxPx={88} minPx={38} usableW={FEED_W - SIDE * 2 - 34} color="#F7F1E6" subColor={T.accent} />
          {d.desc ? <div style={{ marginTop: 16, fontFamily: mincho, color: "#D9CFBE", fontSize: 28, lineHeight: 1.62, letterSpacing: 1 }}>{d.desc}</div> : null}
        </div>
      </div>
      <div style={{ position: "absolute", right: SIDE, bottom: 44, fontFamily: serif, color: "rgba(226,216,200,0.8)", fontSize: 23, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ③C 雑誌エディトリアル（写真を主役に全面／クリームのキャプション枠を重ねる）
// 旧版は左のテラコッタ面が大きすぎたので廃止。誌面のキャプションボックスの作法で、
// 「小見出し→伊語→料理名→罫→説明」を1つの枠に収める＝雑誌のページに見える構成。
export const YoshokuFeedC: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  const PANEL_W = 792;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} />
      {/* 上下だけ軽く沈めてロゴとハンドルを乗せる（料理は暗くしない） */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 74%, rgba(0,0,0,0.34) 100%)" }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>

      {/* 誌面のキャプションボックス（クリーム地・左にテラコッタの small bar） */}
      <div style={{ position: "absolute", left: 56, width: PANEL_W, bottom: 56, background: "#FBF3E2", boxShadow: "0 26px 60px rgba(0,0,0,0.42)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: T.slab }} />
        <div style={{ padding: "30px 38px 32px 46px" }}>
          <div style={{ fontFamily: mincho, color: T.slab, fontSize: 21, letterSpacing: 6, marginBottom: 12 }}>本日のおすすめ</div>
          <div style={{ height: 1, background: "rgba(176,72,31,0.35)", marginBottom: 16 }} />
          <HeroName text={dispName(d)} sub={d.sub} maxPx={76} minPx={30} usableW={PANEL_W - 84} color={INK_D} subColor={T.slab} />
          {d.desc ? (
            <>
              <div style={{ width: 72, height: 3, background: T.slab, margin: "18px 0 14px" }} />
              <div style={{ fontFamily: mincho, color: "rgba(36,26,18,0.8)", fontSize: 26, lineHeight: 1.68, letterSpacing: 1 }}>{d.desc}</div>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ position: "absolute", right: SIDE, bottom: 22, fontFamily: serif, color: "#F2E8D6", fontSize: 22, letterSpacing: 3, textShadow: NAME_SHADOW }}>{handle}</div>
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

// ⑦G センターバンド（全面写真の“上”に帯を渡す。B=下ベタ帯 とは構図が別物）
// 写真は上下フルブリードのまま、料理名の帯だけが画面を横切る＝グリッドで目を引く割り込み。
export const YoshokuFeedG: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  const BAND_TOP = 858, BAND_H = 340;
  return (
    <AbsoluteFill style={{ backgroundColor: MORTAR }}>
      <Photo src={d.src} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.42) 100%)" }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      {/* 中央を横切るモルタルの帯（上下に細いテラコッタ罫） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: BAND_TOP, height: BAND_H, background: "linear-gradient(180deg, " + MORTAR_HI + "F2 0%, " + MORTAR + "F7 100%)", boxShadow: "0 18px 46px rgba(0,0,0,0.45)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: BAND_TOP, height: 4, background: T.accent }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: BAND_TOP + BAND_H - 2, height: 2, background: T.accent, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: BAND_TOP + 40 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={92} minPx={36} usableW={FEED_W - SIDE * 2} color="#F7F1E6" subColor={T.accent} />
        {d.desc ? <div style={{ marginTop: 14, fontFamily: mincho, color: "#D9CFBE", fontSize: 27, lineHeight: 1.6, letterSpacing: 1 }}>{d.desc}</div> : null}
      </div>
      <div style={{ position: "absolute", right: SIDE, bottom: 46, fontFamily: serif, color: "#F0E6D4", fontSize: 23, letterSpacing: 3, textShadow: NAME_SHADOW }}>{handle}</div>
      <Grain opacity={0.05} />
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
      {/* 紙の繊維（ごく薄い織り目）＝“紙もの”の質感 */}
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      {/* 紙の透かし（ごく薄く） */}
      <div style={{ position: "absolute", top: 320, left: -20, right: -20, textAlign: "center", fontFamily: serif, fontStyle: "italic", fontWeight: 600, color: T.slab, opacity: 0.07, fontSize: 300, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{ghost}</div>
      {/* 紙の内枠（額のマット） */}
      <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(150,110,70,0.35)" }} />
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Brand storeName={storeName} accent={T.slab} tint={INK_D} logoH={124} center />
      </div>

      {/* 接地影（皿の下にふわりと影）＝紙の上に“置いてある”ように見せる */}
      <div style={{ position: "absolute", left: 250, top: 916, width: 580, height: 92, background: "radial-gradient(50% 50% at 50% 50%, rgba(74,42,16,0.34) 0%, rgba(74,42,16,0) 70%)" }} />
      {/* 料理：縁をぼかして紙に溶け込ませる（長方形の“貼った感”を消す）＋紙に合わせた暖色グレーディング */}
      <div style={{
        position: "absolute", left: 96, right: 96, top: 322, height: 640,
        WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 47%, #000 54%, rgba(0,0,0,0.55) 72%, transparent 88%)",
        maskImage: "radial-gradient(ellipse 50% 50% at 50% 47%, #000 54%, rgba(0,0,0,0.55) 72%, transparent 88%)",
      }}>
        <Photo src={d.src} bri={1.06} sat={1.06} con={1.04} style={{ filter: "brightness(1.06) saturate(1.06) contrast(1.04) sepia(0.16)" }} />
      </div>

      <div style={{ position: "absolute", left: 76, right: 76, top: 1012, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "5px 16px", border: "1px solid rgba(176,72,31,0.5)", borderRadius: 999, fontFamily: mincho, color: T.slab, fontSize: 20, letterSpacing: 4, marginBottom: 14 }}>本日のおすすめ</div>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={86} minPx={34} usableW={FEED_W - 152} color={INK_D} subColor={T.slab} align="center" />
        {d.desc ? (
          <>
            <div style={{ width: 72, height: 3, background: T.slab, margin: "16px auto 12px" }} />
            <div style={{ fontFamily: mincho, color: "rgba(36,26,18,0.78)", fontSize: 26, lineHeight: 1.62, letterSpacing: 1 }}>{d.desc}</div>
          </>
        ) : null}
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
  { id: "YoshokuFeedC", label: "フィード案C・雑誌エディトリアル(キャプション枠)", comp: YoshokuFeedC },
  { id: "YoshokuFeedE", label: "フィード案E・サイドレール(テラコッタ帯)", comp: YoshokuFeedE },
  { id: "YoshokuFeedE2", label: "フィード案E2・サイドレール(オリーブ帯)", comp: YoshokuFeedE2 },
  { id: "YoshokuFeedE3", label: "フィード案E3・サイドレール(ゴールド帯)", comp: YoshokuFeedE3 },
  { id: "YoshokuFeedH", label: "フィード案H・パーチメント×ぼかし切り抜き", comp: YoshokuFeedH },
  { id: "YoshokuFeedH2", label: "フィード案H2・丸皿カット(正円・テラコッタ地)", comp: YoshokuFeedH2 },
  { id: "YoshokuFeedH3", label: "フィード案H3・角丸ステッカー×ハーフ地", comp: YoshokuFeedH3 },
];
