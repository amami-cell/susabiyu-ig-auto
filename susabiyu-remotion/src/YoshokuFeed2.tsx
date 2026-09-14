// ナガグツ フィード投稿画像テンプレ 追加10種（4:5＝1080×1350・静止画）。
//
// 見た目の作法は既存のフィード案A/B/C/E をそのまま踏襲する（今の見え方が良いという評価のため）：
//   ・料理写真が主役。額装して小さくしない。
//   ・和文＝明朝（見出しは Noto Serif JP Black）、ラテン/数字＝Cormorant。和文を serif で描かない。
//   ・テラコッタは「1枚1焦点」。大面積は深い slab(#C9542E)、小焦点は accent(#E0673A)。
//   ・主役は安全帯 y[150,1200] に収める（IGグリッドの中央1:1クロップで切れないように）。
//   ・暗幕で画面を暗くするより、文字側の多段影(BARE_SHADOW)で可読性を取る。
//
// 伝えたいこと（ナガグツ＝イタリアン肉バル）:
//   ①おしゃれ・デート利用にも耐える画
//   ②ドリンク280円(税込302円)〜＝気軽に飲めるコスパ
// 10種を「おしゃれ寄り」と「価格・コスパ寄り」に振り分け、同じ世界観のまま使い分けられるようにした。
import { AbsoluteFill } from "remotion";

import { ytheme } from "./yoshokuTheme";
import { mincho, minchoBlack, serif, Grain } from "./yoshokuDesign";
import {
  FEED_W, SIDE, Photo, dish, dishes, dispName, jlen,
  HeroName, Logo, Brand, Handle, SmallName,
  BARE_SHADOW, NAME_SHADOW, MORTAR, MORTAR_HI, MORTAR_LO,
} from "./YoshokuFeed";

// props は既存フィードと同じ。ドリンクの訴求文だけ、将来ほかの店でも使えるように上書きできる。
type P = {
  storeName?: string; handle?: string; theme?: string;
  drinkItems?: string;   // 何が安いのか
  drinkPrice?: string;   // 税抜の数字だけ（大きく出す）
  drinkNote?: string;    // 税込のただし書き
};
const D = {
  storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian",
  // ナガグツの現在の価格。他店へ流用する時は stores.py の render_props から渡すこと。
  drinkItems: "生ビール・サワー・ハイボール",
  drinkPrice: "280",
  drinkNote: "税込302円",
};
const CREAM = "#F4EDDD";
const INK_D = "#241A12";
// 写真の上に直接置く欧文キッカー用の色。T.accent（深めのテラコッタ）のままだと
// 明るい料理（黄色い絵皿・パスタ・トマトソース等）に完全に沈んで読めない。
// テラコッタの色味は保ったまま明度だけ上げた“写真上用”のアクセント。
const ACCENT_ON_PHOTO = "#FFCBAC";

// 価格のロックアップ（¥ + 特大数字 + 〜）。数字は Cormorant＝欧文専用。
const PriceTag: React.FC<{ price: string; note: string; color: string; sub: string; size?: number }> =
  ({ price, note, color, sub, size = 150 }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: serif, color, fontSize: Math.round(size * 0.38), fontWeight: 600, lineHeight: 1 }}>¥</span>
        <span style={{ fontFamily: serif, color, fontSize: size, fontWeight: 700, lineHeight: 0.9, letterSpacing: -2 }}>{price}</span>
        <span style={{ fontFamily: mincho, color, fontSize: Math.round(size * 0.3), fontWeight: 700, lineHeight: 1 }}>〜</span>
      </div>
      <div style={{ fontFamily: mincho, color: sub, fontSize: Math.round(size * 0.15), letterSpacing: 2, marginTop: 4 }}>{note}</div>
    </div>
  );

// ドリンクの品目を1行で（長いので枠幅に合わせて詰める）
const DrinkLine: React.FC<{ text: string; w: number; color: string; shadow?: string; max?: number }> =
  ({ text, w, color, shadow, max = 34 }) => (
    <div style={{
      fontFamily: mincho, color, letterSpacing: 1, whiteSpace: "nowrap", textShadow: shadow,
      fontSize: Math.max(20, Math.min(max, Math.floor(w / Math.max(1, jlen(text))))),
    }}>{text}</div>
  );

/* ═══ 画像1 プレッツォ（丸い値札） ══════════════════════════════════════
   料理はフルブリードのまま、右上にテラコッタの丸い値札を1つ置くだけ。
   おしゃれさを崩さずに「280円〜」を出せる、価格訴求の基本形。 */
export const YoshokuFeedPrezzo: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  const R = 340;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={BARE_SHADOW} />
      </div>
      {/* 丸い値札 */}
      <div style={{
        position: "absolute", right: 48, top: 250, width: R, height: R, borderRadius: "50%",
        background: T.slab, border: "3px solid rgba(246,239,224,0.9)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontFamily: serif, color: "rgba(255,246,232,0.9)", fontSize: 22, letterSpacing: 5, fontWeight: 600, marginBottom: 6 }}>DRINK</div>
        <PriceTag price={p.drinkPrice || D.drinkPrice} note={p.drinkNote || D.drinkNote} color="#FFF6E8" sub="rgba(255,246,232,0.85)" size={128} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 128 }}>
        <div style={{ width: 84, height: 6, background: T.accent, marginBottom: 20 }} />
        <HeroName text={dispName(d)} sub={d.sub} maxPx={128} usableW={FEED_W - SIDE * 2 - R * 0.2} color={T.ink} subColor={ACCENT_ON_PHOTO} shadow={BARE_SHADOW} />
        <div style={{ marginTop: 16 }}>
          <DrinkLine text={p.drinkItems || D.drinkItems} w={FEED_W - SIDE * 2} color="#F2E7D4" shadow={BARE_SHADOW} />
        </div>
      </div>
      <Handle handle={handle} color={T.sub} shadow={BARE_SHADOW} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像2 ブリンディジ（乾杯・上下2分割） ══════════════════════════════
   上に料理、下は生成りの紙。「乾杯は、280円から。」を主役の一言にする。
   紙の清潔感でデート利用のトーン。価格は文中に自然に置く。 */
export const YoshokuFeedBrindisi: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  const CUT = 820;
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: CUT, overflow: "hidden" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={BARE_SHADOW} />
      </div>
      {/* 紙の面 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: CUT, bottom: 0, background: CREAM }}>
        <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 54 }}>
          <div style={{ fontFamily: serif, color: T.slab, fontSize: 22, letterSpacing: 8, fontWeight: 600, textTransform: "uppercase" }}>BRINDISI</div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "nowrap" }}>
            <span style={{ fontFamily: minchoBlack, fontWeight: 900, color: INK_D, fontSize: 70, letterSpacing: -1, lineHeight: 1 }}>乾杯は、</span>
            <span style={{ fontFamily: serif, color: T.slab, fontSize: 104, fontWeight: 700, lineHeight: 0.9, letterSpacing: -2 }}>{p.drinkPrice || D.drinkPrice}</span>
            <span style={{ fontFamily: minchoBlack, fontWeight: 900, color: INK_D, fontSize: 70, letterSpacing: -1, lineHeight: 1 }}>円から。</span>
          </div>
          <div style={{ marginTop: 16, height: 1, background: "rgba(36,26,18,0.25)" }} />
          <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <DrinkLine text={p.drinkItems || D.drinkItems} w={620} color="rgba(36,26,18,0.8)" max={30} />
            <span style={{ fontFamily: mincho, color: "rgba(36,26,18,0.6)", fontSize: 22, letterSpacing: 1 }}>{p.drinkNote || D.drinkNote}</span>
          </div>
        </div>
        <div style={{ position: "absolute", right: SIDE, bottom: 34, fontFamily: serif, color: "rgba(36,26,18,0.55)", fontSize: 22, letterSpacing: 3 }}>{handle}</div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像3 ラヴァーニャ（黒板の値札） ═══════════════════════════════════
   下に黒板の帯。チョークの手書き感でコスパ訴求。既存Bのモルタル帯とは
   質感・役割が別（Bは料理名の誌面、こちらは値段の札）。 */
export const YoshokuFeedLavagna: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  // 黒板は「値段の札」なので、中身（2行＋値札）が収まるぶんだけの高さにする。
  // 以前は 880 から始めていて下半分が空き、料理名も写真のど真ん中に乗っていた。
  const TOP = 960;
  return (
    <AbsoluteFill style={{ backgroundColor: "#20221F" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: TOP, overflow: "hidden" }}>
        <Photo src={d.src} />
        {/* 料理名が乗る足元だけを締める（写真全体は明るいまま） */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300,
          background: "linear-gradient(180deg, rgba(20,16,12,0) 0%, rgba(20,16,12,0.5) 55%, rgba(20,16,12,0.78) 100%)" }} />
      </div>
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={BARE_SHADOW} />
      </div>
      {/* 黒板（粉っぽいムラ＋木枠の細い縁） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: TOP, bottom: 0, background: "radial-gradient(120% 90% at 30% 20%, #2E322C 0%, #22251F 60%, #1B1E19 100%)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "repeating-linear-gradient(24deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 7px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 8, background: "#7A5A33" }} />
        <div style={{ position: "absolute", left: SIDE, right: SIDE, top: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: mincho, color: "#EDE7D8", fontSize: 34, letterSpacing: 4, fontWeight: 700 }}>とりあえずの一杯、</div>
            <div style={{ marginTop: 10 }}>
              <DrinkLine text={p.drinkItems || D.drinkItems} w={560} color="rgba(237,231,216,0.86)" max={30} />
            </div>
          </div>
          <PriceTag price={p.drinkPrice || D.drinkPrice} note={p.drinkNote || D.drinkNote} color="#F6EFE0" sub="rgba(246,239,224,0.7)" size={126} />
        </div>
        <div style={{ position: "absolute", right: SIDE, bottom: 30, fontFamily: serif, color: "rgba(237,231,216,0.6)", fontSize: 22, letterSpacing: 3 }}>{handle}</div>
      </div>
      {/* 料理名は写真側の足元に置く（黒板と役割を分ける） */}
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: TOP - 184 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={96} minPx={34} usableW={FEED_W - SIDE * 2} color="#F8F1E2" subColor={ACCENT_ON_PHOTO} shadow={BARE_SHADOW} />
      </div>
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

/* ═══ 画像4 トレ（3品を並べる） ═════════════════════════════════════════
   大1＋小2。「何が食べられる店か」が1枚で分かる。デート前の下調べに効く。 */
export const YoshokuFeedTre: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const it = dishes(3);
  const GAP = 10, TOP = 210;
  const BIG_H = 640, SM_H = 340;
  return (
    <AbsoluteFill style={{ backgroundColor: MORTAR }}>
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} />
      </div>
      {/* 大きい1枚 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: TOP, height: BIG_H, overflow: "hidden" }}>
        <Photo src={it[0].src} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 210,
          background: "linear-gradient(180deg, rgba(20,16,12,0) 0%, rgba(20,16,12,0.46) 55%, rgba(20,16,12,0.72) 100%)" }} />
        <div style={{ position: "absolute", left: SIDE, bottom: 22, right: SIDE }}>
          <HeroName text={dispName(it[0])} sub={it[0].sub} maxPx={72} minPx={30} usableW={FEED_W - SIDE * 2} color="#F8F1E2" subColor={ACCENT_ON_PHOTO} shadow={BARE_SHADOW} />
        </div>
      </div>
      {/* 小さい2枚 */}
      {[1, 2].map((k) => (
        <div key={k} style={{
          position: "absolute", top: TOP + BIG_H + GAP, height: SM_H, overflow: "hidden",
          left: k === 1 ? 0 : (FEED_W + GAP) / 2, width: (FEED_W - GAP) / 2,
        }}>
          <Photo src={it[k].src} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150,
            background: "linear-gradient(180deg, rgba(20,16,12,0) 0%, rgba(20,16,12,0.46) 55%, rgba(20,16,12,0.72) 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 18 }}>
            <SmallName text={dispName(it[k])} w={(FEED_W - GAP) / 2 - 40} color="#F8F1E2" num={"0" + (k + 1)} />
          </div>
        </div>
      ))}
      {/* 足元に価格の一行 */}
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 40, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <DrinkLine text={(p.drinkItems || D.drinkItems) + "  ¥" + (p.drinkPrice || D.drinkPrice) + "〜"} w={700} color="#EDE3D2" max={28} />
        <span style={{ fontFamily: serif, color: "rgba(226,216,200,0.75)", fontSize: 21, letterSpacing: 3 }}>{handle}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像5 ビリエット（半券・チケット） ════════════════════════════════
   写真の上に半券を1枚。ミシン目と通し番号で“酒場の伝票”の気軽さを出しつつ、
   紙の白で清潔に見せる。価格は半券の中に収める。 */
export const YoshokuFeedBiglietto: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <Photo src={d.src} bri={0.98} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={BARE_SHADOW} />
      </div>
      {/* 半券 */}
      <div style={{ position: "absolute", left: 62, right: 62, bottom: 120, background: CREAM, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        {/* ミシン目（上下） */}
        {["top", "bottom"].map((side) => (
          <div key={side} style={{
            position: "absolute", left: 0, right: 0, [side]: -7, height: 14,
            background: "repeating-linear-gradient(90deg, transparent 0 12px, " + T.base + " 12px 14px)",
          } as React.CSSProperties} />
        ))}
        <div style={{ padding: "34px 40px 30px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: serif, color: T.slab, fontSize: 21, letterSpacing: 6, fontWeight: 600 }}>MEAT BAR · NAGAGUTSU</span>
            <span style={{ fontFamily: serif, color: "rgba(36,26,18,0.45)", fontSize: 19, letterSpacing: 3 }}>NO.0427</span>
          </div>
          <div style={{ marginTop: 18, height: 1, background: "rgba(36,26,18,0.25)" }} />
          <div style={{ marginTop: 20 }}>
            <HeroName text={dispName(d)} sub={d.sub} maxPx={74} minPx={30} usableW={FEED_W - 124 - 80} color={INK_D} subColor={T.slab} />
          </div>
          <div style={{ marginTop: 22, borderTop: "1px dashed rgba(36,26,18,0.35)", paddingTop: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: mincho, color: "rgba(36,26,18,0.6)", fontSize: 20, letterSpacing: 3, marginBottom: 6 }}>DRINK</div>
              <DrinkLine text={p.drinkItems || D.drinkItems} w={520} color={INK_D} max={28} />
            </div>
            <PriceTag price={p.drinkPrice || D.drinkPrice} note={p.drinkNote || D.drinkNote} color={T.slab} sub="rgba(36,26,18,0.55)" size={104} />
          </div>
        </div>
      </div>
      <Handle handle={handle} color="#F2E8D6" shadow={BARE_SHADOW} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像6 ヴェトリーナ（アーチの窓） ══════════════════════════════════
   生成りの壁にアーチ型の窓を抜いて料理を見せる。いちばん“おしゃれ・デート”寄り。
   価格は出さず、世界観だけで見せる1枚。 */
export const YoshokuFeedVetrina: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  const AW = 700, AH = 860, AL = (FEED_W - AW) / 2, AT = 210;
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      {/* 壁のムラ */}
      <AbsoluteFill style={{ background: "radial-gradient(90% 70% at 50% 30%, #F7F1E3 0%, #EDE4D2 70%, #E4D9C4 100%)" }} />
      {/* アーチ窓 */}
      <div style={{
        position: "absolute", left: AL, top: AT, width: AW, height: AH,
        borderRadius: AW / 2 + "px " + AW / 2 + "px 12px 12px", overflow: "hidden",
        boxShadow: "0 30px 70px rgba(90,60,30,0.3)",
      }}>
        <Photo src={d.src} />
      </div>
      {/* 窓の細い縁 */}
      <div style={{
        position: "absolute", left: AL - 10, top: AT - 10, width: AW + 20, height: AH + 20,
        borderRadius: (AW + 20) / 2 + "px " + (AW + 20) / 2 + "px 16px 16px",
        border: "2px solid " + T.slab, opacity: 0.55,
      }} />
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Logo storeName={storeName} h={116} />
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: AT + AH + 36, textAlign: "center" }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={72} minPx={30} usableW={FEED_W - SIDE * 2} color={INK_D} subColor={T.slab} align="center" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", fontFamily: serif, color: "rgba(36,26,18,0.5)", fontSize: 22, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

/* ═══ 画像7 ヌメロ280（特大の数字） ═════════════════════════════════════
   価格そのものを絵にする。いちばん強い訴求。数字の裏に料理を透かす。 */
export const YoshokuFeedNumero: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  return (
    <AbsoluteFill style={{ backgroundColor: "#16110C" }}>
      <Photo src={d.src} bri={0.72} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,9,6,0.66) 0%, rgba(12,9,6,0.18) 34%, rgba(12,9,6,0.3) 62%, rgba(12,9,6,0.88) 100%)" }} />
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} shadow={BARE_SHADOW} />
      </div>
      {/* 特大の数字 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center" }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 10, fontWeight: 600, textTransform: "uppercase", textShadow: BARE_SHADOW }}>DRINK FROM</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: serif, color: "#FFF6E8", fontSize: 140, fontWeight: 600, lineHeight: 1, textShadow: NAME_SHADOW }}>¥</span>
          <span style={{ fontFamily: serif, color: "#FFF6E8", fontSize: 360, fontWeight: 700, lineHeight: 0.84, letterSpacing: -10, textShadow: NAME_SHADOW }}>{p.drinkPrice || D.drinkPrice}</span>
        </div>
        <div style={{ marginTop: 10, fontFamily: mincho, color: "#F2E7D4", fontSize: 26, letterSpacing: 3, textShadow: BARE_SHADOW }}>{p.drinkNote || D.drinkNote}</div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
          <DrinkLine text={p.drinkItems || D.drinkItems} w={860} color="#F6EFE0" shadow={BARE_SHADOW} max={36} />
        </div>
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: 118, textAlign: "center" }}>
        <div style={{ width: 84, height: 5, background: T.accent, margin: "0 auto 16px" }} />
        <HeroName text={dispName(d)} sub={d.sub} maxPx={62} minPx={28} usableW={FEED_W - SIDE * 2} color={T.ink} subColor={ACCENT_ON_PHOTO} align="center" shadow={BARE_SHADOW} />
      </div>
      <Handle handle={handle} color={T.sub} shadow={BARE_SHADOW} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像8 メヌ（縦組みの品書き） ══════════════════════════════════════
   右に料理、左の濃色パネルに縦組みで品書きを3行。和の縦組み×イタリアンの配色。 */
export const YoshokuFeedMenu: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const it = dishes(3);
  const PANEL = 440;
  return (
    <AbsoluteFill style={{ backgroundColor: MORTAR }}>
      <div style={{ position: "absolute", left: PANEL, right: 0, top: 0, bottom: 0, overflow: "hidden" }}>
        <Photo src={it[0].src} />
      </div>
      {/* 左の濃色パネル */}
      <div style={{ position: "absolute", left: 0, top: 0, width: PANEL, bottom: 0, background: "linear-gradient(180deg, " + MORTAR_HI + " 0%, " + MORTAR + " 55%, " + MORTAR_LO + " 100%)" }} />
      <div style={{ position: "absolute", left: PANEL - 4, top: 0, bottom: 0, width: 4, background: T.slab }} />
      <div style={{ position: "absolute", left: 34, top: 34 }}>
        <Logo storeName={storeName} h={104} />
      </div>
      {/* 縦組みの品書き（右→左に3行）。
          幅は「左パネルの中」に必ず収める。以前は right: PANEL-380 と書いていて、
          これは画面右端からの距離になるため列が写真の上まで流れ出し、
          長い品名は画面下にもはみ出していた。 */}
      <div style={{ position: "absolute", left: 30, width: PANEL - 60, top: 200, height: 790, display: "flex", flexDirection: "row-reverse", gap: 22, justifyContent: "center" }}>
        {it.map((x, k) => {
          const nm = dispName(x).replace(/[｜\n]/g, "");
          // 縦組みなので「列の高さ ÷ 文字数」。番号のぶん(34px)を引いた実寸で決める。
          const size = Math.max(24, Math.min(50, Math.floor(756 / Math.max(1, jlen(nm)))));
          return (
            <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontFamily: serif, color: T.accent, fontSize: 19, letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>{"0" + (k + 1)}</div>
              <div style={{ writingMode: "vertical-rl", fontFamily: minchoBlack, fontWeight: 900, color: k === 0 ? "#F8F1E2" : "rgba(248,241,226,0.72)", fontSize: size, letterSpacing: 1, lineHeight: 1 }}>{nm}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 30, width: PANEL - 60, bottom: 120 }}>
        <div style={{ height: 1, background: "rgba(246,239,224,0.3)", marginBottom: 14 }} />
        <DrinkLine text={p.drinkItems || D.drinkItems} w={PANEL - 60} color="rgba(237,227,210,0.9)" max={22} />
        <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: serif, color: T.accent, fontSize: 30, fontWeight: 600 }}>¥</span>
          <span style={{ fontFamily: serif, color: "#FFF6E8", fontSize: 68, fontWeight: 700, lineHeight: 1, letterSpacing: -1 }}>{p.drinkPrice || D.drinkPrice}</span>
          <span style={{ fontFamily: mincho, color: "#FFF6E8", fontSize: 26, fontWeight: 700 }}>〜</span>
        </div>
        <div style={{ fontFamily: mincho, color: "rgba(237,227,210,0.65)", fontSize: 19, letterSpacing: 1, marginTop: 2 }}>{p.drinkNote || D.drinkNote}</div>
      </div>
      <div style={{ position: "absolute", left: 30, bottom: 44, fontFamily: serif, color: "rgba(226,216,200,0.7)", fontSize: 20, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像9 ドゥエ（2枚並び・シェア） ═══════════════════════════════════
   上下に2品を並べて「ふたりで、シェア。」。デート／2人利用の提案そのもの。 */
export const YoshokuFeedDue: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const it = dishes(2);
  // 写真2枚 + 足元の「ふたりで、シェア。」+ ドリンク1行が 1350 に収まる高さ。
  // 520 だと足元の一行が画面下で切れていた（200+520*2+8+30+54 > 1350）。
  const H = 470, GAP = 8, TOP = 200;
  return (
    <AbsoluteFill style={{ backgroundColor: MORTAR }}>
      <div style={{ position: "absolute", top: 24, left: 26 }}>
        <Brand storeName={storeName} accent={T.accent} />
      </div>
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", left: 0, right: 0, top: TOP + k * (H + GAP), height: H, overflow: "hidden" }}>
          <Photo src={it[k].src} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 190,
            background: "linear-gradient(180deg, rgba(20,16,12,0) 0%, rgba(20,16,12,0.46) 55%, rgba(20,16,12,0.72) 100%)" }} />
          <div style={{ position: "absolute", left: SIDE, bottom: 20, right: SIDE }}>
            <HeroName text={dispName(it[k])} sub={it[k].sub} maxPx={64} minPx={28} usableW={FEED_W - SIDE * 2} color="#F8F1E2" subColor={ACCENT_ON_PHOTO} shadow={BARE_SHADOW} />
          </div>
        </div>
      ))}
      {/* 2枚のあいだに「＆」 */}
      <div style={{
        position: "absolute", left: (FEED_W - 88) / 2, top: TOP + H - 44 + GAP / 2, width: 88, height: 88,
        borderRadius: "50%", background: T.slab, border: "2px solid rgba(246,239,224,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
      }}>
        <span style={{ fontFamily: serif, color: "#FFF6E8", fontSize: 44, fontWeight: 600, lineHeight: 1 }}>&amp;</span>
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: TOP + H * 2 + GAP + 26, textAlign: "center" }}>
        <div style={{ fontFamily: minchoBlack, fontWeight: 900, color: "#F8F1E2", fontSize: 54, letterSpacing: 2, lineHeight: 1.2 }}>ふたりで、シェア。</div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
          <DrinkLine text={(p.drinkItems || D.drinkItems) + "  ¥" + (p.drinkPrice || D.drinkPrice) + "〜（" + (p.drinkNote || D.drinkNote) + "）"} w={900} color="rgba(237,227,210,0.9)" max={26} />
        </div>
      </div>
      <div style={{ position: "absolute", right: SIDE, bottom: 34, fontFamily: serif, color: "rgba(226,216,200,0.72)", fontSize: 21, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ═══ 画像10 ティンブロ（判子） ═════════════════════════════════════════
   クラフト紙にテラコッタの角判子を捺したような1枚。手仕事感で
   「気取らないけど雑じゃない」を出す。価格は判子の中へ。 */
export const YoshokuFeedTimbro: React.FC<P> = (p) => {
  const { storeName = D.storeName, handle = D.handle, theme = D.theme } = p;
  const T = ytheme(theme); const d = dish();
  const PW = 860, PH = 700, PL = (FEED_W - PW) / 2, PT = 250;
  return (
    <AbsoluteFill style={{ backgroundColor: "#D9C8AC" }}>
      <AbsoluteFill style={{ background: "radial-gradient(90% 70% at 50% 30%, #E4D4B9 0%, #D6C4A6 70%, #C8B593 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(90deg, rgba(90,60,30,0.5) 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, rgba(90,60,30,0.4) 0 1px, transparent 1px 5px)" }} />
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Logo storeName={storeName} h={112} />
      </div>
      {/* 貼った写真（白フチ） */}
      <div style={{ position: "absolute", left: PL, top: PT, width: PW, height: PH, background: "#FBF7EE", padding: 16, boxShadow: "0 26px 60px rgba(90,60,30,0.4)", transform: "rotate(-1.2deg)" }}>
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <Photo src={d.src} />
        </div>
      </div>
      {/* 角判子 */}
      <div style={{
        position: "absolute", right: 54, top: PT + PH - 150, width: 260, height: 200,
        border: "6px solid " + T.slab, transform: "rotate(-8deg)", opacity: 0.92,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "rgba(251,247,238,0.55)",
      }}>
        <div style={{ fontFamily: serif, color: T.slab, fontSize: 19, letterSpacing: 4, fontWeight: 600 }}>DRINK</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: serif, color: T.slab, fontSize: 34, fontWeight: 700 }}>¥</span>
          <span style={{ fontFamily: serif, color: T.slab, fontSize: 84, fontWeight: 700, lineHeight: 1, letterSpacing: -2 }}>{p.drinkPrice || D.drinkPrice}</span>
          <span style={{ fontFamily: mincho, color: T.slab, fontSize: 30, fontWeight: 700 }}>〜</span>
        </div>
        <div style={{ fontFamily: mincho, color: T.slab, fontSize: 17, letterSpacing: 1 }}>{p.drinkNote || D.drinkNote}</div>
      </div>
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: PT + PH + 60 }}>
        <HeroName text={dispName(d)} sub={d.sub} maxPx={70} minPx={28} usableW={FEED_W - SIDE * 2 - 40} color={INK_D} subColor={T.slab} />
        <div style={{ marginTop: 14 }}>
          <DrinkLine text={p.drinkItems || D.drinkItems} w={FEED_W - SIDE * 2} color="rgba(36,26,18,0.72)" max={26} />
        </div>
      </div>
      <div style={{ position: "absolute", right: SIDE, bottom: 34, fontFamily: serif, color: "rgba(36,26,18,0.55)", fontSize: 22, letterSpacing: 3 }}>{handle}</div>
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

// 確認アプリ／登録用のひとまとめ（Root.tsx と prepare.py の並びをここに合わせる）
export const FEED2_COMPS: { id: string; pattern: string; label: string; comp: React.FC<P> }[] = [
  { id: "YoshokuFeedPrezzo", pattern: "yoshokufeedprezzo", label: "画像1・丸い値札（280円〜）", comp: YoshokuFeedPrezzo },
  { id: "YoshokuFeedBrindisi", pattern: "yoshokufeedbrindisi", label: "画像2・乾杯は280円から（上下2分割）", comp: YoshokuFeedBrindisi },
  { id: "YoshokuFeedLavagna", pattern: "yoshokufeedlavagna", label: "画像3・黒板の値札", comp: YoshokuFeedLavagna },
  { id: "YoshokuFeedTre", pattern: "yoshokufeedtre", label: "画像4・3品を並べる", comp: YoshokuFeedTre },
  { id: "YoshokuFeedBiglietto", pattern: "yoshokufeedbiglietto", label: "画像5・半券（チケット）", comp: YoshokuFeedBiglietto },
  { id: "YoshokuFeedVetrina", pattern: "yoshokufeedvetrina", label: "画像6・アーチの窓（デート寄り）", comp: YoshokuFeedVetrina },
  { id: "YoshokuFeedNumero", pattern: "yoshokufeednumero", label: "画像7・特大280（価格が主役）", comp: YoshokuFeedNumero },
  { id: "YoshokuFeedMenu", pattern: "yoshokufeedmenu", label: "画像8・縦組みの品書き", comp: YoshokuFeedMenu },
  { id: "YoshokuFeedDue", pattern: "yoshokufeeddue", label: "画像9・ふたりでシェア（2枚並び）", comp: YoshokuFeedDue },
  { id: "YoshokuFeedTimbro", pattern: "yoshokufeedtimbro", label: "画像10・クラフト紙に判子", comp: YoshokuFeedTimbro },
];
