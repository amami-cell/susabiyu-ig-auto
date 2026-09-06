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
import { typoPhotos } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import { mincho, minchoBlack, serif, Grain, Vignette, WarmGlow, StoreLogo, splitLines } from "./yoshokuDesign";

export const FEED_W = 1080;
export const FEED_H = 1350;
export const FEED_DUR = 1; // 静止画（stillで1フレーム抜く）

type P = { storeName?: string; handle?: string; theme?: string };
const D = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };
const SIDE = 64;

function dish() {
  return typoPhotos[0] || { src: "", caption: "", sub: "", story: "", disp: "" };
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
      <div style={{ fontFamily: minchoBlack, fontWeight: 900, color, fontSize: size, lineHeight: 1.06, letterSpacing: -2, textShadow: shadow }}>
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

// ブランド・ロックアップ（左上・安全帯内）。ロゴ画像があれば横ロゴ、無ければ明朝で店名（＝和文serifバグ回避）。
const Brand: React.FC<{ storeName: string; accent: string; tint?: string; logoH?: number; kicker?: string; shadow?: string; center?: boolean }> =
  ({ storeName, accent, tint = "#F6EFE0", logoH = 66, kicker = "MEAT BAR", shadow, center = false }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", gap: 8 }}>
      <StoreLogo storeName={storeName} height={logoH} tint={tint} />
      <div style={{ fontFamily: serif, color: accent, fontSize: 20, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, textShadow: shadow }}>{kicker}</div>
    </div>
  );

const Handle: React.FC<{ handle: string; color: string; shadow?: string }> = ({ handle, color, shadow }) => (
  <div style={{ position: "absolute", right: SIDE, bottom: 54, fontFamily: serif, color, fontSize: 24, letterSpacing: 3, textShadow: shadow }}>{handle}</div>
);

const NAME_SHADOW = "0 3px 22px rgba(0,0,0,0.85)";

// ①A フルブリード×ボトム暗幕（定番・最強のデフォルト）
export const YoshokuFeedA: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 46%, rgba(18,13,8,0.92) 88%, " + T.footBase + " 100%)" }} />
      <div style={{ position: "absolute", top: 150, left: SIDE }}>
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
      <div style={{ position: "absolute", top: 150, left: SIDE }}>
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
export const YoshokuFeedC: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const SLAB = 486;
  return (
    <AbsoluteFill style={{ backgroundColor: T.slab }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: SLAB, right: 0, overflow: "hidden" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: SLAB, background: T.slab }} />
      <div style={{ position: "absolute", top: 150, left: 48 }}>
        <Brand storeName={storeName} accent="#F6EFE0" tint="#F6EFE0" kicker="MEAT BAR" />
      </div>
      <div style={{ position: "absolute", left: 48, width: SLAB - 84, top: 320 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={118} usableW={SLAB - 96} color="#FDF6EA" subColor="rgba(253,246,234,0.85)" />
      </div>
      <div style={{ position: "absolute", left: 48, bottom: 60, fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ④D 縦組み特大明朝×半身シズル（フィードで珍しい縦組み＝パターン割り込み）
export const YoshokuFeedD: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} pos="70% 50%" />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, " + T.base + "F2 0%, " + T.base + "99 30%, rgba(0,0,0,0) 58%)" }} />
      <div style={{ position: "absolute", top: 150, left: SIDE }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      {d.sub ? <div style={{ position: "absolute", top: 300, left: SIDE, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5, textTransform: "uppercase", fontWeight: 600, maxWidth: 360, textShadow: NAME_SHADOW }}>{d.sub}</div> : null}
      <div style={{ position: "absolute", top: 360, left: SIDE, height: 800 }}>
        <VName text={dispName(d)} color={T.ink} maxPx={132} availH={800} shadow={NAME_SHADOW} />
      </div>
      <Handle handle={handle} color={T.sub} shadow={NAME_SHADOW} />
      <Vignette strength={0.4} /><Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑤E サイドレール・ブランド（全面写真＋左のテラコッタ縦帯＝グリッドの統一シグネチャ）
export const YoshokuFeedE: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const RAIL = 74;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: RAIL, right: 0, overflow: "hidden" }}>
        <Photo src={d.src} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(18,13,8,0.9) 92%, " + T.footBase + " 100%)" }} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: RAIL, background: T.slab, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: "#FDF6EA", fontSize: 22, letterSpacing: 10, textTransform: "uppercase", fontWeight: 600 }}>NAGAGUTSU&nbsp;·&nbsp;MEAT&nbsp;BAR</div>
      </div>
      <div style={{ position: "absolute", top: 150, left: RAIL + 40 }}>
        <StoreLogo storeName={storeName} height={60} tint="#F6EFE0" />
      </div>
      <div style={{ position: "absolute", left: RAIL + 40, right: SIDE, bottom: 150 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={140} usableW={FEED_W - RAIL - 40 - SIDE} color={T.ink} subColor="#F0DFC6" shadow={NAME_SHADOW} />
      </div>
      <Handle handle={handle} color={T.sub} shadow={NAME_SHADOW} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑥F テラコッタ・リボン販促（全面写真＋「本日のおすすめ」ベタ帯＝集客の顔）
export const YoshokuFeedF: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 55%, rgba(18,13,8,0.92) 92%, " + T.footBase + " 100%)" }} />
      <div style={{ position: "absolute", top: 150, left: SIDE }}>
        <Brand storeName={storeName} accent={T.accent} shadow={NAME_SHADOW} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 930, height: 104, background: T.slab, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 40px rgba(0,0,0,0.45)" }}>
        <span style={{ fontFamily: mincho, color: "#FDF6EA", fontSize: 46, fontWeight: 700, letterSpacing: 8 }}>本日のおすすめ</span>
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 1070 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={92} usableW={FEED_W - SIDE * 2} color={T.ink} subColor="#F0DFC6" align="center" shadow={NAME_SHADOW} />
      </div>
      <Vignette strength={0.36} /><Grain opacity={0.05} />
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
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 62%, " + T.footBase + " 100%)" }} />
      </div>
      <div style={{ position: "absolute", top: 150, left: SIDE }}>
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

// ⑧H 大タイポ・カバー（巨大ゴースト欧文＋中央写真バンド＋鋭い明朝）
export const YoshokuFeedH: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish();
  const ghost = (d.sub || "MEAT BAR").split(" ")[0];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + " 0%, " + T.footBase + " 100%)" }}>
      <div style={{ position: "absolute", top: 250, left: -20, right: -20, textAlign: "center", fontFamily: serif, fontStyle: "italic", fontWeight: 600, color: T.accent, opacity: 0.12, fontSize: 300, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{ghost}</div>
      <div style={{ position: "absolute", top: 150, left: SIDE }}>
        <Brand storeName={storeName} accent={T.accent} />
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 430, height: 520, overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.55)" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 1000 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={88} usableW={FEED_W - SIDE * 2} color={T.ink} subColor={T.accent} align="center" />
      </div>
      <Handle handle={handle} color={T.sub} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

export const FEED_COMPS: { id: string; label: string; comp: React.FC<P> }[] = [
  { id: "YoshokuFeedA", label: "フィード案A・フルブリード×ボトム暗幕(定番)", comp: YoshokuFeedA },
  { id: "YoshokuFeedB", label: "フィード案B・ボトムバンド・エディトリアル", comp: YoshokuFeedB },
  { id: "YoshokuFeedC", label: "フィード案C・カラースラブ分割(テラコッタ面)", comp: YoshokuFeedC },
  { id: "YoshokuFeedD", label: "フィード案D・縦組み特大明朝", comp: YoshokuFeedD },
  { id: "YoshokuFeedE", label: "フィード案E・サイドレール・ブランド", comp: YoshokuFeedE },
  { id: "YoshokuFeedF", label: "フィード案F・テラコッタ帯(本日のおすすめ)", comp: YoshokuFeedF },
  { id: "YoshokuFeedG", label: "フィード案G・マガジン・エディトリアル", comp: YoshokuFeedG },
  { id: "YoshokuFeedH", label: "フィード案H・大タイポ・カバー", comp: YoshokuFeedH },
];
