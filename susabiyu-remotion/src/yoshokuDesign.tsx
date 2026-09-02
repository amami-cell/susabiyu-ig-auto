// ── 洋食おしゃれテンプレ 共通デザインシステム ────────────────────────────────
// 「トラットリア／肉バルの高級感」を一本のブランド動画として統一するための土台。
// フォント・余白（セーフエリア）・モーション・写真の見せ方・粒状感・ロゴ・キッカーを
// ここに集約し、10テンプレ全部がこの語彙だけで組まれるようにする（＝世界観の統一）。
//
// 設計方針:
//  ・Instagramストーリーズ(1080x1920)前提。上下のUI帯を避けたセーフエリア内に主役情報を置く。
//  ・情報は「一画面ひとつの主役」。説明文の羅列はしない（キャプション＝映像の一部）。
//  ・モーションは意味のある最小限（フェード／わずかなスケール／ブラー解除／パララックス）。
//    盛らない・跳ねさせない＝“AIっぽさ”を避け高級感を出す。
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cormorant";
import { typoLogo } from "./typoData";

export const mincho = loadMincho().fontFamily;
export const serif = loadSerif().fontFamily;

// 上品な減速（out-expo系）。全テンプレでこの1本に統一＝動きの質感が揃う。
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// セーフエリア（px）。ストーリーズの上=プロフィール/時間、下=返信バーを避ける。
// 主役テキストは y ∈ [SAFE.top, 1920-SAFE.bottom] に収める。
export const SAFE = { top: 250, bottom: 320, side: 84 };

// ── モーション・プリミティブ ───────────────────────────────
// 立ち上がり（透明→不透明＋わずかに下から＋任意でブラー解除）。文字の“出現”はこれで統一。
export function rise(
  f: number, start: number,
  opts?: { dist?: number; dur?: number; blur?: number }
): React.CSSProperties {
  const dist = opts?.dist ?? 40;
  const dur = opts?.dur ?? 26;
  const o = interpolate(f, [start, start + dur], [0, 1], clamp);
  const y = interpolate(f, [start, start + dur], [dist, 0], { ...clamp, easing: EASE });
  const st: React.CSSProperties = { opacity: o, transform: "translateY(" + y + "px)" };
  if (opts?.blur) {
    const b = interpolate(f, [start, start + dur], [opts.blur, 0], { ...clamp, easing: EASE });
    st.filter = "blur(" + b + "px)";
  }
  return st;
}

// フェードのみ（位置を動かしたくない要素用）。
export function fade(f: number, start: number, dur = 22): number {
  return interpolate(f, [start, start + dur], [0, 1], clamp);
}

// 罫線が横に伸びる（区切り・下線の“引き”）。
export function drawW(f: number, start: number, to: number, dur = 30): number {
  return interpolate(f, [start, start + dur], [0, to], { ...clamp, easing: EASE });
}

// ── 粒状感（フィルムグレイン）───────────────────────────────
// のっぺりした暗背景に“紙／フィルム”の質感を与える。グレースケールのノイズをoverlayで薄く。
const _grain =
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
export const GRAIN = "url(\"data:image/svg+xml;utf8," + encodeURIComponent(_grain) + "\")";

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => (
  <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px", opacity, mixBlendMode: "overlay", pointerEvents: "none" }} />
);

// エッジを締めるビネット（視線を中央へ）。強すぎると安っぽいので控えめ既定。
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.42 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 40%, rgba(0,0,0,0) 48%, rgba(0,0,0," + strength + ") 100%)", pointerEvents: "none" }} />
);

// 上からの暖色ライトリーク（ビストロの灯り。ごく薄く）。
export const WarmGlow: React.FC<{ color?: string }> = ({ color = "#E7C873" }) => (
  <AbsoluteFill style={{ background: "radial-gradient(80% 40% at 50% -6%, " + color + "22 0%, transparent 60%)", pointerEvents: "none" }} />
);

// ── 写真レイヤー（ケンバーンズ）─────────────────────────────
// frame/dur は“そのカット内”の相対値を渡す（Slides内でも正しく動く）。寄りすぎ防止のため
// スケールは既定 1.04→1.10 に抑制。fit=cover でも中心を大きく削らない範囲。
export const PhotoLayer: React.FC<{
  src: string; frame: number; dur: number;
  from?: number; to?: number; panX?: number; panY?: number;
  brightness?: number; sat?: number; blur?: number; fit?: React.CSSProperties["objectFit"];
  position?: string;
}> = (p) => {
  const s = interpolate(p.frame, [0, p.dur], [p.from ?? 1.04, p.to ?? 1.10], clamp);
  const px = p.panX ? interpolate(p.frame, [0, p.dur], [-p.panX, p.panX], clamp) : 0;
  const py = p.panY ? interpolate(p.frame, [0, p.dur], [-p.panY, p.panY], clamp) : 0;
  let filt = "brightness(" + (p.brightness ?? 1) + ") saturate(" + (p.sat ?? 1.06) + ")";
  if (p.blur) filt += " blur(" + p.blur + "px)";
  return (
    <Img src={staticFile(p.src)} style={{
      width: "100%", height: "100%", objectFit: p.fit ?? "cover",
      objectPosition: p.position ?? "center",
      transform: "translate(" + px + "px," + py + "px) scale(" + s + ")", filter: filt,
    }} />
  );
};

// ── スライドショー（クロスフェード）──────────────────────────
// count枚を total フレームで均等クロスフェード。render(i, local, seg) に“カット内相対フレーム”を渡す。
// 初手はフェードインなしで即表示、最後はフェードアウトせず保持（＝抜けが自然）。
export const Slides: React.FC<{
  count: number; total: number; fade?: number;
  render: (i: number, local: number, seg: number) => React.ReactNode;
}> = ({ count, total, fade = 20, render }) => {
  const f = useCurrentFrame();
  const seg = total / count;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const s = i * seg;
        // 前カットの抜けと同じ窓で入る＝黒に落ちない真のクロスディゾルブ。
        const inA = i === 0 ? -1 : s - fade;
        const inB = i === 0 ? 0 : s;
        const outA = i === count - 1 ? total + 1 : s + seg - fade;
        const outB = i === count - 1 ? total + 2 : s + seg;
        const o = interpolate(f, [inA, inB, outA, outB], [i === 0 ? 1 : 0, 1, 1, i === count - 1 ? 1 : 0], clamp);
        if (o <= 0.001) return null;
        return (
          <AbsoluteFill key={i} style={{ opacity: o }}>
            {render(i, f - s, seg)}
          </AbsoluteFill>
        );
      })}
    </>
  );
};

// ── 店舗ロゴ（横型）──────────────────────────────────────
// Drive由来の横ロゴ(typoLogo)があれば画像で表示。無ければ明朝の文字ロゴにフォールバック。
// 暗背景前提なので drop-shadow で浮かせる。
export const StoreLogo: React.FC<{ storeName: string; height?: number; tint?: string }> = ({
  storeName, height = 88, tint = "#F4EFE4",
}) => {
  if (typoLogo) {
    return (
      <Img src={staticFile(typoLogo)} style={{
        height, width: "auto", maxWidth: 960, objectFit: "contain",
        filter: "drop-shadow(0 3px 14px rgba(0,0,0,0.55))",
      }} />
    );
  }
  return (
    <div style={{ fontFamily: mincho, color: tint, fontSize: height, fontWeight: 700, letterSpacing: height * 0.12, lineHeight: 1, textShadow: "0 3px 16px rgba(0,0,0,0.5)" }}>
      {storeName}
    </div>
  );
};

// ラテンのキッカー（罫なし・控えめ）。上部の小さなブランドサイン。中央寄せは使わず既定は左。
export const Kicker: React.FC<{ text: string; color: string; f: number; start: number; size?: number; align?: "left" | "center" }> = ({
  text, color, f, start, size = 24, align = "left",
}) => (
  <div style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start", ...rise(f, start, { dist: 10 }) }}>
    <div style={{ fontFamily: serif, color, fontSize: size, letterSpacing: 5, fontWeight: 600, textTransform: "uppercase", opacity: 0.9, whiteSpace: "nowrap" }}>{text}</div>
  </div>
);

// マストヘッド（左上）：店舗ロゴを主役サイズで置き、その下に小さなラテンのキッカー。
// エディトリアルの“表紙の頭”。全テンプレでロゴ位置を左上に統一＝ブランドの一貫性。
export const Masthead: React.FC<{ storeName: string; f: number; kicker?: string; accent: string; tint?: string; logoH?: number }> = ({
  storeName, f, kicker, accent, tint, logoH = 78,
}) => (
  <div style={{ position: "absolute", top: SAFE.top - 74, left: SAFE.side, ...rise(f, 6, { dist: 12 }) }}>
    <StoreLogo storeName={storeName} height={logoH} tint={tint} />
    {kicker ? (
      <div style={{ marginTop: 12, fontFamily: serif, color: accent, fontSize: 23, letterSpacing: 5, fontWeight: 600, textTransform: "uppercase", opacity: 0.88 }}>{kicker}</div>
    ) : null}
  </div>
);

// フッター（左下・小）：ハンドルのみの控えめな締め。ロゴはマストヘッドに置くので重複させない。
export const HandleMark: React.FC<{ handle: string; accent: string; f: number; start: number; align?: "left" | "center" }> = ({
  handle, accent, f, start, align = "left",
}) => (
  <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 150, textAlign: align, ...rise(f, start, { dist: 10 }) }}>
    <span style={{ fontFamily: serif, color: accent, fontSize: 26, letterSpacing: 4, opacity: 0.85 }}>{handle}</span>
  </div>
);

// 料理写真を主役にする“ステージ”：同じ写真の暗ぼかしを全面に敷き、中央に額装カードで全体を見せる。
// フルブリードだと料理が寄りすぎるため、カード表示で一皿の全体像を上品に見せる（バル×エディトリアル）。
export const DishStage: React.FC<{
  srcs: string[]; total: number; base: string; accent: string; line?: string;
  cardW?: number; cardH?: number; cardTop?: number; radius?: number;
}> = ({ srcs, total, base, accent, cardW = 900, cardH = 1140, cardTop = 360, radius = 14 }) => {
  const n = Math.max(1, srcs.length);
  const left = (1080 - cardW) / 2;
  return (
    <>
      {/* 背景：同写真の暗ぼかし（奥行き・色調の統一）＋パララックスでゆっくり */}
      <AbsoluteFill>
        <Slides count={n} total={total} render={(i, local, seg) => (
          <PhotoLayer src={srcs[i]} frame={local} dur={seg} from={1.16} to={1.24} blur={34} brightness={0.42} sat={1.05} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + base + "F0 0%, " + base + "44 26%, " + base + "55 66%, " + base + "F7 100%)" }} />
      {/* 主役：額装カード（極細の金ヘアライン＋やわらかい影。装飾は足さない） */}
      <div style={{ position: "absolute", top: cardTop, left, width: cardW, height: cardH }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", border: "1px solid " + accent + "55", boxShadow: "0 40px 100px rgba(0,0,0,0.62)" }}>
          <Slides count={n} total={total} render={(i, local, seg) => (
            <PhotoLayer src={srcs[i]} frame={local} dur={seg} from={1.03} to={1.09} sat={1.08} />
          )} />
        </div>
      </div>
    </>
  );
};

// 現在の料理名を、カット進行に合わせて返す（下部の料理名タグ用）。
export function dishAt(srcs: { caption: string }[], f: number, total: number): string {
  const n = Math.max(1, srcs.length);
  const seg = total / n;
  const i = Math.min(n - 1, Math.floor(f / seg));
  return srcs[i]?.caption || "";
}

// キャプション（フック）の改行位置は「｜」または改行で明示制御する。無ければ1行。
export function splitLines(s: string): string[] {
  return (s || "").split(/[｜\n]/).map((x) => x.trim()).filter((x) => x.length > 0);
}

// いま表示すべきカット番号と、そのカット内相対フレームを返す（テキストは常に“1件だけ”描く用）。
// 写真はクロスディゾルブ(Slides)でも、文字は重ねない＝カット単位でハードに切替えて二重表示を防ぐ。
export function segNow(total: number, count: number, f: number): { i: number; local: number; seg: number } {
  const seg = total / count;
  const i = Math.min(count - 1, Math.max(0, Math.floor(f / seg)));
  return { i, local: f - i * seg, seg };
}

// 文字数から見出しサイズを決める（2行前提・スマホでも読める下限を確保）。
export function heroSize(text: string, big: number, small: number): number {
  const n = Array.from(text || "").length;
  if (n <= 8) return big;
  if (n <= 12) return Math.round((big + small) / 2);
  if (n <= 18) return small;
  return Math.round(small * 0.86);
}
