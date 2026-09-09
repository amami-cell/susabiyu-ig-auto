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
import { loadFont as loadMinchoBlack } from "@remotion/google-fonts/NotoSerifJP";
import { typoLogo, typoLogoRound, typoLogoColor, typoSampleNo, typoPhotos } from "./typoData";
import { ytheme } from "./yoshokuTheme";

export const mincho = loadMincho().fontFamily;
export const serif = loadSerif().fontFamily;
// 極太明朝（Noto Serif JP Black=weight 900）。フィードの巨大料理名など“質量で殴る”見出し用。
// 明朝の語彙のまま真の極太にできるのでブランド（トラットリア/肉バル）を崩さない。fontWeight:900 で使う。
export const minchoBlack = loadMinchoBlack().fontFamily;

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

// 色付きの文字ロゴ（フィード投稿と同じ typoLogoColor）。無ければ通常ロゴ→店名にフォールバック。
export const StoreLogoColor: React.FC<{ storeName: string; height?: number }> = ({ storeName, height = 132 }) => {
  if (typoLogoColor) {
    return (
      <Img src={staticFile(typoLogoColor)} style={{
        height, width: "auto", maxWidth: 860, objectFit: "contain",
        filter: "drop-shadow(0 3px 16px rgba(0,0,0,0.6))",
      }} />
    );
  }
  return <StoreLogo storeName={storeName} height={height} />;
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

// 現在の料理の「ストーリー用の短い一言（story）」を返す。無ければ空。
export function storyAt(srcs: { story?: string }[], f: number, total: number): string {
  const n = Math.max(1, srcs.length);
  const seg = total / n;
  const i = Math.min(n - 1, Math.floor(f / seg));
  return srcs[i]?.story || "";
}

// 見本ギャラリー専用の番号バッジ（右上・小）。typoSampleNo>0 の時だけ表示＝本番投稿には出ない。
// 「どの動画のことか」を指して修正指示を出せるように、控えめだが視認できるタグにする。
export const SampleBadge: React.FC<{ accent?: string; f?: number }> = ({ accent = "#E7DCC4", f = 999 }) => {
  if (!typoSampleNo || typoSampleNo <= 0) return null;
  const o = fade(f, 2, 12);
  return (
    <div style={{
      position: "absolute", top: 40, right: 40, zIndex: 50, opacity: o,
      display: "flex", alignItems: "baseline", gap: 6,
      padding: "10px 18px", borderRadius: 999,
      background: "rgba(10,10,12,0.62)", border: "1px solid " + accent + "88",
      boxShadow: "0 6px 20px rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
    }}>
      <span style={{ fontFamily: serif, color: accent, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", opacity: 0.9 }}>No.</span>
      <span style={{ fontFamily: serif, color: "#F6EFE0", fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{typoSampleNo}</span>
    </div>
  );
};

// キャプション（フック）の改行位置は「｜」または改行で明示制御する。無ければ1行。
// ── 共通オープニング／エンドロール（No.1〜4のストーリーに前後付け）──────────────
// ブランドの“顔”を最初と最後に見せる。丸ロゴ(typoLogoRound)があれば色付きで、無ければ横ロゴ/店名。
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
export const STORY_OPEN = 56;   // オープニング 1.9s（ゆっくり）
export const STORY_END = 104;   // エンドロール 3.5s（ゆっくり）
export const STORY_XF = 24;     // 本編→CLOSE の重なりクロスフェード（じわーっと移行）

// OP/CLOSE の既定の地。ここ1か所を変えれば10本すべてのオープニング／クローズに反映される。
// 比較用プレビュー（YoshokuOpBlur / OpMortar / OpWine）で選んでから、この既定値を差し替える運用。
export const STORY_BG: StoryBg = "dark";

// OP/CLOSE の背景。真っ黒一色だと重く沈むので、地の選択肢を用意して比較できるようにする。
//  dark   = 従来（テーマの base 一色）
//  blur   = 料理写真を大きくぼかして敷く（店の色がにじむ・いちばん“お店らしい”）
//  mortar = モルタル塗り壁＋中央のやわらかいスポット（落ち着いた内装の壁）
//  wine   = 深いボルドー〜黒のグラデ＋光のにじみ（ブランド色に寄せた華やかさ）
export type StoryBg = "dark" | "blur" | "mortar" | "wine";

export const StoryBgLayer: React.FC<{ bg?: StoryBg; theme?: string; dur?: number }> = ({ bg = "dark", theme = "italian", dur = 120 }) => {
  const f = useCurrentFrame();
  const T = ytheme(theme);
  // どの案もごくゆっくり動かす（止め絵にしない・でも忙しくしない）
  const z = interpolate(f, [0, dur], [1.06, 1.14], { ...clamp, easing: EASE });

  if (bg === "blur") {
    const src = (typoPhotos[0] && typoPhotos[0].src) || "";
    return (
      <AbsoluteFill style={{ backgroundColor: T.base }}>
        {src ? (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <Img src={staticFile(src)} style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: "scale(" + z + ")",
              filter: "blur(54px) brightness(0.46) saturate(1.18)",
            }} />
          </AbsoluteFill>
        ) : null}
        {/* 中央を少し明るく／四隅を落として、ロゴが必ず抜けて見えるようにする */}
        <AbsoluteFill style={{ background: "radial-gradient(70% 46% at 50% 46%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 62%, rgba(0,0,0,0.72) 100%)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(60% 36% at 50% 40%, " + T.accent + "1f 0%, transparent 70%)" }} />
        <Grain opacity={0.1} />
      </AbsoluteFill>
    );
  }

  if (bg === "mortar") {
    return (
      <AbsoluteFill style={{ background: "radial-gradient(115% 80% at 50% 38%, #3C3833 0%, #2E2B27 52%, #1E1C19 100%)" }}>
        {/* 塗り壁のムラ（コテ跡っぽい斜めの濃淡）＋細かな砂目 */}
        <AbsoluteFill style={{ opacity: 0.16, backgroundImage: "repeating-linear-gradient(118deg, rgba(255,255,255,0.10) 0 3px, transparent 3px 26px)" }} />
        <AbsoluteFill style={{ opacity: 0.1, backgroundImage: "repeating-linear-gradient(28deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 19px)" }} />
        <AbsoluteFill style={{ opacity: 0.5, backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1.6px)", backgroundSize: "18px 18px", mixBlendMode: "overlay" }} />
        {/* 上からの暖色スポット（間接照明） */}
        <AbsoluteFill style={{ background: "radial-gradient(52% 34% at 50% 30%, " + T.accent + "2e 0%, transparent 72%)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(100% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)" }} />
        <Grain opacity={0.09} />
      </AbsoluteFill>
    );
  }

  if (bg === "wine") {
    return (
      <AbsoluteFill style={{ background: "radial-gradient(105% 75% at 50% 34%, #5A1A20 0%, #331014 44%, #14090A 100%)" }}>
        {/* グラスに差す光のにじみ（ごくゆっくり広がる） */}
        <AbsoluteFill style={{ background: "radial-gradient(38% 24% at 50% 30%, rgba(255,214,170,0.20) 0%, transparent 72%)", transform: "scale(" + z + ")" }} />
        <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 26px)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(100% 70% at 50% 52%, transparent 34%, rgba(0,0,0,0.62) 100%)" }} />
        <Grain opacity={0.1} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <WarmGlow /><Grain />
    </AbsoluteFill>
  );
};

export const BrandMark: React.FC<{ storeName: string; ink: string; size?: number }> = ({ storeName, ink, size = 300 }) => (
  typoLogoRound
    ? <Img src={staticFile(typoLogoRound)} style={{ width: size, height: size, objectFit: "contain", filter: "drop-shadow(0 8px 30px rgba(0,0,0,0.55))" }} />
    : (typoLogo
      ? <Img src={staticFile(typoLogo)} style={{ height: Math.round(size * 0.5), width: "auto", maxWidth: 820, objectFit: "contain" }} />
      : <div style={{ fontFamily: mincho, color: ink, fontSize: Math.round(size * 0.4), fontWeight: 700, letterSpacing: 2 }}>{storeName}</div>)
);

export const StoryOpening: React.FC<{ storeName?: string; theme?: string; bg?: StoryBg }> = ({ storeName = "ナガグツ", theme = "italian", bg = STORY_BG }) => {
  const f = useCurrentFrame();
  const T = ytheme(theme);
  // ゆっくり立ち上げ→終わりは全体をやわらかくフェードアウト（忙しくしない）
  const o = Math.min(interpolate(f, [0, 20], [0, 1], clamp), interpolate(f, [STORY_OPEN - 18, STORY_OPEN], [1, 0], clamp));
  const s = interpolate(f, [0, 42], [0.92, 1], { ...clamp, easing: EASE });
  const ruleW = interpolate(f, [12, 44], [0, 260], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <StoryBgLayer bg={bg} theme={theme} dur={STORY_OPEN} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: o }}>
        <div style={{ transform: "scale(" + s + ")", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <BrandMark storeName={storeName} ink={T.ink} size={300} />
          <div style={{ width: ruleW, height: 2, background: T.accent, opacity: 0.9 }} />
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 40, letterSpacing: 14, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// エンドロール：本編のラスト STORY_XF フレームに重ねて配置する前提。
// 最初の STORY_XF で画面全体(root)をじわーっとフェードイン＝本編からのクロスディゾルブ。
// その後にロゴ／コピーがゆっくり立ち上がる（忙しさを解消）。
export const StoryEndroll: React.FC<{ storeName?: string; handle?: string; theme?: string; bg?: StoryBg }> = ({ storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian", bg = STORY_BG }) => {
  const f = useCurrentFrame();
  const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE }); // 本編に重ねてじわーっと
  const cO = interpolate(f, [STORY_XF, STORY_XF + 30], [0, 1], clamp);
  const y = interpolate(f, [STORY_XF, STORY_XF + 40], [26, 0], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, opacity: rootO }}>
      <StoryBgLayer bg={bg} theme={theme} dur={STORY_END + STORY_XF} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: cO, transform: "translateY(" + y + "px)", textAlign: "center", gap: 18 }}>
        <BrandMark storeName={storeName} ink={T.ink} size={230} />
        <div style={{ fontFamily: mincho, color: T.ink, fontSize: 56, fontWeight: 700, letterSpacing: 3 }}>ご来店をお待ちしています</div>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 6 }}>{storeName}　{handle}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export function splitLines(s: string): string[] {
  return (s || "").split(/[｜\n]/).map((x) => x.trim()).filter((x) => x.length > 0);
}

// 大きな中央見出し用：｜/改行があればそれで、無ければ日本語の読点「、」で自然に2行へ割る。
// （超特大タイポが幅に収まらず語中で不格好に折れるのを防ぐ。短い語はそのまま1行。）
export function phraseLines(s: string): string[] {
  const hard = (s || "").split(/[｜\n]/).map((x) => x.trim()).filter((x) => x.length > 0);
  if (hard.length > 1) return hard;
  const t = (s || "").trim();
  if (Array.from(t).length >= 8 && t.indexOf("、") >= 0) {
    const i = t.indexOf("、");
    return [t.slice(0, i + 1), t.slice(i + 1)].map((x) => x.trim()).filter((x) => x.length > 0);
  }
  return t ? [t] : [];
}

// いま表示すべきカット番号と、そのカット内相対フレームを返す（テキストは常に“1件だけ”描く用）。
// 写真はクロスディゾルブ(Slides)でも、文字は重ねない＝カット単位でハードに切替えて二重表示を防ぐ。
export function segNow(total: number, count: number, f: number): { i: number; local: number; seg: number } {
  const seg = total / count;
  const i = Math.min(count - 1, Math.max(0, Math.floor(f / seg)));
  return { i, local: f - i * seg, seg };
}

// 「必ず1行に収める」ためのサイズ決定。和文は概ね1文字=1emなので、幅÷文字数で上限を出す。
// 折り返して不格好な2行になるのを防ぐ（料理名を1行で見せたい時に使う）。
export function fitOneLine(text: string, maxPx: number, usableW: number, minPx = 30): number {
  const n = Math.max(1, Array.from((text || "").replace(/[｜\n]/g, "")).length);
  return Math.max(minPx, Math.min(maxPx, Math.floor(usableW / n)));
}

// 文字数から見出しサイズを決める（2行前提・スマホでも読める下限を確保）。
export function heroSize(text: string, big: number, small: number): number {
  const n = Array.from(text || "").length;
  if (n <= 8) return big;
  if (n <= 12) return Math.round((big + small) / 2);
  if (n <= 18) return small;
  return Math.round(small * 0.86);
}
