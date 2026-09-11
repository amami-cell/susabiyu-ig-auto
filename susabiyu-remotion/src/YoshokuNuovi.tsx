// 洋食おしゃれ「イタリアン酒場」追加12種（No.12〜No.23）。
//
// 既存11種（本日の一皿／黒板／鉄板／雑誌エディトリアル／シネマ／ワイン／おすすめ3品／
// ポラロイド／大見出しタイポ／OPEN案内／雑誌ストーリー）と“絵として”かぶらないよう、
// 使う小道具と動きの軸をそれぞれ別にした。既存にある「紙の誌面」「黒板」「インスタント写真」
// 「レターボックス」「大見出しだけ」は使わない。
//
// 守っている共通ルール（他の動画と揃える）:
//   ・ロゴは左上（Masthead / SAFE.top-74, SAFE.side）
//   ・ハンドルは左下（HandleMark）※紙もの2種は誌面の作法に合わせて中に置く
//   ・料理名は明朝700・1行（fitOneLine）、伊語サブは Cormorant 30/字送り4/大文字
//   ・説明文は明朝・最大36px（fitLines）
//   ・OP(表紙) → 本編 → CLOSE(裏表紙) の3段構成、音楽は全体に通す
//
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, EASE_INOUT, fade, rise, Grain, Vignette,
  Masthead, HandleMark, StoreLogo, fitOneLine, fitLines, splitLines, segNow, SAFE,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenXF, StoryEndV } from "./YoshokuOpStyles";

const BODY = 400;                                   // 本編 400f（4品×100f＝約13.3秒）
export const YNUOVI_DUR = STORY_OPEN + BODY + STORY_END;   // 90+400+150 = 640 = 約21.3秒

type Item = { src?: string; caption?: string; sub?: string; disp?: string; desc?: string };

const EMPTY: Item = { src: "", caption: "", sub: "", disp: "", desc: "" };
function dishes(n: number): Item[] {
  const p: Item[] = (typoPhotos as Item[]).length ? (typoPhotos as Item[]) : [EMPTY];
  return Array.from({ length: n }, (_, i) => p[i] || p[p.length - 1]);
}
function nameOf(d: Item): string {
  const nm = (d.disp && d.disp.length) ? d.disp : (d.caption || "");
  return nm.replace(/[｜\n]/g, "");   // 料理名は必ず1行
}

// 料理写真。ケンバーンズは弱く（酒場の落ち着き）。
const Photo: React.FC<{
  src?: string; lf?: number; seg?: number; from?: number; to?: number;
  bri?: number; blur?: number; style?: React.CSSProperties;
}> = ({ src, lf = 0, seg = 100, from = 1.02, to = 1.08, bri = 1.06, blur = 0, style }) => {
  const z = interpolate(lf, [0, seg], [from, to], clamp);
  if (!src) return null;
  return (
    <Img src={staticFile(src)} style={{
      width: "100%", height: "100%", objectFit: "cover",
      transform: "scale(" + z + ")",
      filter: "brightness(" + bri + ") saturate(1.12) contrast(1.04)" + (blur ? " blur(" + blur + "px)" : ""),
      ...style,
    }} />
  );
};

// 料理名＋伊語サブ＋説明文の“下組み”。既存テンプレと同じ字の大きさに揃える。
const Caption: React.FC<{
  d: Item; f: number; start?: number; ink: string; sub: string; accent: string;
  w?: number; align?: "left" | "center"; shadow?: boolean; maxName?: number;
}> = ({ d, f, start = 0, ink, sub, accent, w = 1080 - SAFE.side * 2, align = "left", shadow = true, maxName = 84 }) => {
  const sh = shadow ? "0 3px 22px rgba(0,0,0,0.55)" : "none";
  const nm = nameOf(d);
  return (
    <div style={{ textAlign: align, ...rise(f, start, { dist: 18 }) }}>
      {d.sub ? <div style={{ fontFamily: serif, color: accent, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, textShadow: sh }}>{d.sub}</div> : null}
      <div style={{ fontFamily: mincho, color: ink, fontSize: fitOneLine(nm, maxName, w, 30), fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, whiteSpace: "nowrap", textShadow: sh }}>{nm}</div>
      {d.desc ? (
        <div style={{ marginTop: 14, fontFamily: mincho, color: sub, letterSpacing: 1, lineHeight: 1.42, fontSize: fitLines(d.desc, 36, w, 22), textShadow: sh }}>
          {splitLines(d.desc).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
        </div>
      ) : null}
    </div>
  );
};

// 3段（OP→本編→CLOSE）の共通の殻。中身だけ差し替える。
const Shell: React.FC<{
  v: 4 | 5 | 6 | 7 | 8 | 9; base: string; storeName: string; handle: string; theme: string;
  children: React.ReactNode;
}> = ({ v, base, storeName, handle, theme, children }) => (
  <AbsoluteFill style={{ backgroundColor: base }}>
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)}
      volume={(ff) => interpolate(ff, [0, 16, YNUOVI_DUR - 30, YNUOVI_DUR], [0, 0.8, 0.8, 0], clamp)} />
    {/* 本編を先に置き、その上にOPを重ねてディゾルブ（既存テンプレと同じ繋ぎ） */}
    <Sequence from={STORY_OPEN} durationInFrames={BODY}>{children}</Sequence>
    <Sequence durationInFrames={STORY_OPEN + STORY_XF}>
      <StoryOpenXF v={v} storeName={storeName} theme={theme} />
    </Sequence>
    <Sequence from={STORY_OPEN + BODY - STORY_XF} durationInFrames={STORY_END + STORY_XF}>
      <StoryEndV v={v} storeName={storeName} handle={handle} theme={theme} />
    </Sequence>
  </AbsoluteFill>
);

type P = { storeName?: string; handle?: string; theme?: string };
const D = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };

/* ═══ No.12 コント（伝票） ═══════════════════════════════════════════════
   酒場の“お勘定”の紙。細長いレシートが上から伸びながら品名を打ち出していく。
   既存の「紙の誌面（雑誌）」とは別物＝ざらついた感熱紙・等幅・ドットリーダー。 */
const PAPER_W = 760;
const ContoBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const grow = interpolate(f, [0, 70], [280, 1150], { ...clamp, easing: EASE });   // 紙が伸びる
  const left = (1080 - PAPER_W) / 2;
  return (
    <AbsoluteFill style={{ backgroundColor: "#14100C" }}>
      {/* 奥は一皿をぼかして敷く（真っ黒だと寒々しいので、料理の色を残す） */}
      <AbsoluteFill><Photo src={items[0].src} lf={f} seg={BODY} from={1.2} to={1.3} bri={0.34} blur={28} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.72) 0%, rgba(10,8,6,0.5) 40%, rgba(10,8,6,0.86) 100%)" }} />
      {/* 感熱紙 */}
      <div style={{ position: "absolute", left, top: 210, width: PAPER_W, height: grow, background: "#F7F3EA", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        {/* ミシン目の下端 */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "repeating-linear-gradient(90deg, #F7F3EA 0 12px, rgba(0,0,0,0.16) 12px 20px)" }} />
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fade(f, 8, 18) }}>
          <StoreLogo storeName={storeName} height={56} tint="#241A12" />
        </div>
        <div style={{ position: "absolute", top: 128, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.slab, fontSize: 26, letterSpacing: 10, fontWeight: 600, opacity: fade(f, 14, 18) }}>CONTO DEL GIORNO</div>
        <div style={{ position: "absolute", top: 176, left: 48, right: 48, height: 2, background: "rgba(36,26,18,0.28)", opacity: fade(f, 18, 16) }} />
        {/* 品名の行が順に“印字”される（左から幅が出る＝プリンタの走り） */}
        {items.map((d, k) => {
          const s = 46 + k * 46;
          const w = interpolate(f, [s, s + 26], [0, 100], { ...clamp, easing: EASE_INOUT });
          const nm = nameOf(d);
          return (
            <div key={k} style={{ position: "absolute", top: 214 + k * 132, left: 48, right: 48, overflow: "hidden" }}>
              <div style={{ width: w + "%", overflow: "hidden" }}>
                <div style={{ fontFamily: mincho, color: "#241A12", fontSize: fitOneLine(nm, 48, PAPER_W - 96, 26), fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>{nm}</div>
                <div style={{ marginTop: 6, fontFamily: serif, color: T.slab, fontSize: 22, letterSpacing: 5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{d.sub || ""}</div>
                <div style={{ marginTop: 10, height: 1, background: "repeating-linear-gradient(90deg, rgba(36,26,18,0.4) 0 3px, transparent 3px 9px)" }} />
              </div>
            </div>
          );
        })}
        {/* 締めのスタンプ（斜めに押す） */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: 800, display: "flex", justifyContent: "center",
          opacity: fade(f, 210, 14),
          transform: "rotate(-8deg) scale(" + interpolate(f, [210, 226], [1.5, 1], { ...clamp, easing: EASE }) + ")",
        }}>
          <div style={{ border: "5px solid " + T.slab, color: T.slab, fontFamily: serif, fontSize: 54, letterSpacing: 10, fontWeight: 700, padding: "10px 28px" }}>GRAZIE</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 980, textAlign: "center", fontFamily: serif, color: "rgba(36,26,18,0.6)", fontSize: 24, letterSpacing: 4, opacity: fade(f, 226, 16) }}>{handle}</div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuConto: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={4} base="#14100C" storeName={storeName} handle={handle} theme={theme}>
    <ContoBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.13 ヴィコロ（路地のネオン） ════════════════════════════════════
   夜の路地。店名のネオン管がチカッと瞬いてから灯り、その照り返しが料理に落ちる。
   既存で夜＝暗い画面はあるが、発光する看板とその照り返しは他にない。 */
const VicoloBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  // 点灯のちらつき（最初の20フレームだけ不規則に）
  const flick = f < 20 ? [0, 1, 0.2, 1, 0.1, 0.9, 1][Math.floor(f / 3) % 7] : 1;
  const glow = T.accent;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0A09" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.06} to={1.14} bri={0.52} /></AbsoluteFill>
      {/* 路地の暗さ。中央だけ少し明るく＝看板の照り返し */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 44% at 50% 22%, rgba(224,103,58,0.22) 0%, rgba(0,0,0,0) 60%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,5,4,0.78) 0%, rgba(6,5,4,0.16) 34%, rgba(6,5,4,0.5) 70%, rgba(6,5,4,0.94) 100%)" }} />
      <Vignette strength={0.5} />
      {/* ネオンの看板（管の縁取り＝多重グロー） */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", opacity: flick }}>
        <div style={{
          fontFamily: serif, color: "#FFF4E6", fontSize: 92, letterSpacing: 14, fontWeight: 600, textTransform: "uppercase",
          textShadow: "0 0 10px " + glow + ", 0 0 26px " + glow + ", 0 0 60px " + glow + ", 0 0 110px " + glow,
        }}>{T.label}</div>
        <div style={{ margin: "22px auto 0", width: 360, height: 3, background: glow, boxShadow: "0 0 12px " + glow + ", 0 0 34px " + glow }} />
        <div style={{ marginTop: 20, fontFamily: mincho, color: "#F3E6D2", fontSize: 34, letterSpacing: 8, textShadow: "0 0 18px rgba(224,103,58,0.6)" }}>{storeName}</div>
      </div>
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={local} start={8} ink="#F6EFE0" sub="#D6C4A0" accent={T.accent} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={24} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
export const YoshokuVicolo: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={6} base="#0B0A09" storeName={storeName} handle={handle} theme={theme}>
    <VicoloBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.14 チケッティ（カウンターを横に歩く） ══════════════════════════
   小皿が並ぶバーカウンターを横へ流して見る。切り替えではなく“ひと続きの移動”。
   既存は全部その場で入れ替わるので、横に動き続ける画はここだけ。 */
const CicchettiBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, seg } = segNow(BODY, 4, f);
  // 1品ぶんずつ、止まっては滑る（等速で流し続けると料理が読めない）
  const x = -1080 * interpolate(
    f,
    [0, seg - 24, seg, seg * 2 - 24, seg * 2, seg * 3 - 24, seg * 3, BODY],
    [0, 0, 1, 1, 2, 2, 3, 3],
    { ...clamp, easing: EASE_INOUT },
  );
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <AbsoluteFill style={{ transform: "translateX(" + x + "px)", width: 1080 * 4 }}>
        {items.map((d, k) => (
          <div key={k} style={{ position: "absolute", left: k * 1080, top: 0, width: 1080, height: 1920, overflow: "hidden" }}>
            <Photo src={d.src} lf={0} seg={1} from={1.04} to={1.04} bri={1.0} />
          </div>
        ))}
      </AbsoluteFill>
      {/* カウンターの陰（上下）＝並んだ皿を見ている目線 */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,5,0.8) 0%, rgba(10,8,5,0.05) 26%, rgba(10,8,5,0.1) 58%, rgba(10,8,5,0.92) 100%)" }} />
      <Masthead storeName={storeName} f={f} kicker="CICCHETTI" accent={T.accent} logoH={78} />
      {/* 下の帯だけは動かさない＝止まった台の上を皿が流れていく */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 250, height: 4, background: T.slab, opacity: 0.9 }} />
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={f - i * seg} start={6} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      {/* 何皿目か（点で示す） */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 196, display: "flex", gap: 12 }}>
        {items.map((_, k) => (
          <div key={k} style={{ width: k === i ? 34 : 10, height: 10, borderRadius: 5, background: k === i ? T.accent : "rgba(246,239,224,0.35)" }} />
        ))}
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuCicchetti: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={5} base="#17110b" storeName={storeName} handle={handle} theme={theme}>
    <CicchettiBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.15 マヨリカ（陶タイル） ════════════════════════════════════════
   イタリアの絵付けタイル。画面をタイルに割り、順にめくれて次の皿になる。
   幾何パターンで割る画は既存に無い。 */
const TILE_C = 3, TILE_R = 5;
const TILE_H = 1080;   // タイル全体の高さ（下の文字と重ならない高さに収める）
const MaiolicaBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local } = segNow(BODY, 4, f);
  const pv = items[(i + 3) % 4];   // ひとつ前の皿。ここから今の皿へめくる
  const W = 1080 / TILE_C, H = TILE_H / TILE_R;
  const top = 430;
  return (
    <AbsoluteFill style={{ backgroundColor: "#F3EBDC" }}>
      {/* 目地と外周のマヨリカ帯 */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(45deg, rgba(201,84,46,0.07) 0 14px, rgba(255,255,255,0) 14px 28px)" }} />
      <div style={{ position: "absolute", inset: 40, border: "3px solid " + T.slab, opacity: 0.5 }} />
      <div style={{ position: "absolute", left: 40, right: 40, top: 40, height: 26, background: "repeating-linear-gradient(90deg, " + T.slab + " 0 26px, #2F5D50 26px 52px)" , opacity: 0.85 }} />
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 40, height: 26, background: "repeating-linear-gradient(90deg, #2F5D50 0 26px, " + T.slab + " 26px 52px)", opacity: 0.85 }} />
      <div style={{ position: "absolute", top: 160, left: 0, right: 0, display: "flex", justifyContent: "center", ...rise(f, 4, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={86} tint="#241A12" />
      </div>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.slab, fontSize: 26, letterSpacing: 10, fontWeight: 600 }}>MAIOLICA</div>
      {/* タイル：左上から順にめくれて次の皿が出る */}
      <div style={{ position: "absolute", left: 0, top, width: 1080, height: TILE_H }}>
        {Array.from({ length: TILE_C * TILE_R }).map((_, t) => {
          const c = t % TILE_C, r = Math.floor(t / TILE_C);
          const s = 8 + (c + r) * 7;                       // 斜めに伝播
          const p = interpolate(local, [s, s + 26], [0, 1], { ...clamp, easing: EASE_INOUT });
          const flipped = p > 0.5;
          const sx = Math.abs(1 - p * 2);                  // 1→0→1（半分でめくれる）
          const d = flipped ? items[i] : pv;
          return (
            <div key={t} style={{
              position: "absolute", left: c * W, top: r * H, width: W, height: H,
              overflow: "hidden", border: "3px solid #F7F2E6",
              transform: "scaleX(" + Math.max(0.02, sx) + ")",
            }}>
              {/* 1枚の写真をタイルの位置で切り出す＝割れた絵がちゃんと1枚に見える */}
              <div style={{ position: "absolute", left: -c * W, top: -r * H, width: 1080, height: TILE_H }}>
                <Photo src={d.src} lf={0} seg={1} from={1} to={1} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: 1560, textAlign: "center" }}>
        <Caption d={items[i]} f={local} start={30} ink="#241A12" sub="rgba(36,26,18,0.8)" accent={T.slab} align="center" shadow={false} maxName={76} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, textAlign: "center", fontFamily: serif, color: T.slab, fontSize: 26, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
export const YoshokuMaiolica: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={7} base="#F3EBDC" storeName={storeName} handle={handle} theme={theme}>
    <MaiolicaBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.16 トリコローレ（三色の帯で切り替える） ════════════════════════
   緑・白・赤の帯が画面を走り抜けて次の皿へ。テンポが速く、勢いで見せる1本。
   既存はどれもゆっくり溶ける繋ぎなので、速い切り替えはここだけ。 */
const GREEN = "#2F6B47", RED = "#C0392B", CREAM = "#F4EEE2";
const TricoloreBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const bars = [GREEN, CREAM, RED];
  return (
    <AbsoluteFill style={{ backgroundColor: "#141210" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.1} to={1.02} bri={0.98} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,6,0.66) 0%, rgba(10,8,6,0.06) 30%, rgba(10,8,6,0.12) 62%, rgba(10,8,6,0.9) 100%)" }} />
      {/* 3本の帯が時間差で右→左に走り抜ける＝その裏で皿が入れ替わっている */}
      {bars.map((c, k) => {
        const s = seg - 26 + k * 5;
        const x = interpolate(local, [s, s + 30], [1180, -1180], { ...clamp, easing: EASE_INOUT });
        return <div key={k} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1080, background: c, transform: "translateX(" + x + "px)" }} />;
      })}
      <Masthead storeName={storeName} f={f} kicker="OSTERIA" accent={T.accent} logoH={78} />
      {/* 料理名は帯が抜けた直後に、下から勢いよく */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={local} start={4} ink={T.ink} sub={T.sub} accent={T.accent} maxName={90} />
      </div>
      {/* 三色の細いサイン */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 250, display: "flex" }}>
        {bars.map((c, k) => <div key={k} style={{ width: 54, height: 8, background: c }} />)}
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={20} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuTricolore: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={8} base="#141210" storeName={storeName} handle={handle} theme={theme}>
    <TricoloreBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.17 プロヴィーノ（フィルムのベタ焼き） ══════════════════════════
   35mmのベタ焼きシート。コマが順に赤で囲まれ、選ばれた1コマが引き伸ばされる。
   ポラロイド（既存⑧）とは別物＝穴あきストリップ・コマ番号・赤鉛筆の丸。 */
const ProvinoBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const FW = 420, FH = 300, GAP = 26;
  const cols = 2, rows = 2;
  const gw = cols * FW + (cols - 1) * GAP, gh = rows * FH + (rows - 1) * GAP;
  const gx = (1080 - gw) / 2, gy = 470;
  // 選ばれたコマが引き伸ばされて全面に（各カットの後半）
  const blow = interpolate(local, [seg - 46, seg - 12], [0, 1], { ...clamp, easing: EASE });
  const bx = gx + (i % cols) * (FW + GAP), by = gy + Math.floor(i / cols) * (FH + GAP);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0E0D0C" }}>
      {/* ベタ焼きシート */}
      <div style={{ position: "absolute", left: gx - 34, top: gy - 44, width: gw + 68, height: gh + 88, background: "#161412", border: "1px solid rgba(246,239,224,0.14)" }} />
      {items.map((d, k) => {
        const c = k % cols, r = Math.floor(k / cols);
        const on = k <= i;
        return (
          <div key={k} style={{ position: "absolute", left: gx + c * (FW + GAP), top: gy + r * (FH + GAP), width: FW, height: FH, overflow: "hidden", opacity: on ? 1 : 0.28 }}>
            <Photo src={d.src} lf={0} seg={1} from={1.02} to={1.02} bri={on ? 1.0 : 0.6} />
            {/* コマ番号 */}
            <div style={{ position: "absolute", left: 8, bottom: 6, fontFamily: serif, color: "#F6EFE0", fontSize: 20, letterSpacing: 2, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{"1" + (k + 1) + "A"}</div>
            {/* 選んだコマを赤鉛筆で囲む */}
            {k === i ? <div style={{ position: "absolute", inset: 0, border: "5px solid " + RED, opacity: fade(local, 6, 12) }} /> : null}
          </div>
        );
      })}
      {/* パーフォレーション（上下） */}
      {[gy - 44, gy + gh + 22].map((ty, k) => (
        <div key={k} style={{ position: "absolute", left: gx - 34, top: ty, width: gw + 68, height: 22, background: "repeating-linear-gradient(90deg, rgba(246,239,224,0.82) 0 14px, transparent 14px 34px)", opacity: 0.5 }} />
      ))}
      {/* 引き伸ばし：選ばれたコマが画面いっぱいへ */}
      {blow > 0.001 ? (
        <AbsoluteFill style={{ opacity: blow }}>
          <div style={{
            position: "absolute",
            left: bx + (0 - bx) * blow, top: by + (0 - by) * blow,
            width: FW + (1080 - FW) * blow, height: FH + (1920 - FH) * blow, overflow: "hidden",
          }}>
            <Photo src={items[i].src} lf={local} seg={seg} from={1.04} to={1.1} />
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,6,0.6) 0%, rgba(8,7,6,0.05) 30%, rgba(8,7,6,0.55) 68%, rgba(8,7,6,0.94) 100%)" }} />
          </div>
        </AbsoluteFill>
      ) : null}
      <Masthead storeName={storeName} f={f} kicker="PROVINO" accent={T.accent} logoH={78} />
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={local} start={seg - 40} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={20} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
export const YoshokuProvino: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={4} base="#0E0D0C" storeName={storeName} handle={handle} theme={theme}>
    <ProvinoBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.18 カルトリーナ（イタリアからの絵はがき） ══════════════════════
   切手・消印・手書きの一言。届いた便りとして一皿を見せる。
   紙ものだが雑誌（既存④⑪）とは別＝はがき1枚・切手・丸い消印。 */
const CartolinaBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const drop = interpolate(local, [0, 26], [-40, 0], { ...clamp, easing: EASE });
  const tilt = (i % 2 === 0 ? -1.6 : 1.4);
  const stampIn = interpolate(local, [20, 40], [1.6, 1], { ...clamp, easing: EASE });
  const post = interpolate(local, [34, 52], [1.9, 1], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: "#2A2018" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.22} to={1.3} bri={0.4} blur={30} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(22,16,11,0.55)" }} />
      {/* はがき本体 */}
      <div style={{
        position: "absolute", left: 78, right: 78, top: 330, height: 1180, background: "#F6F1E4",
        boxShadow: "0 40px 90px rgba(0,0,0,0.62)",
        transform: "translateY(" + drop + "px) rotate(" + tilt + "deg)",
        opacity: fade(local, 0, 16),
      }}>
        <div style={{ position: "absolute", inset: 18, border: "1px solid rgba(36,26,18,0.25)" }} />
        {/* 写真（はがきの上半分） */}
        <div style={{ position: "absolute", left: 44, right: 44, top: 44, height: 620, overflow: "hidden" }}>
          <Photo src={items[i].src} lf={local} seg={seg} from={1.03} to={1.09} />
        </div>
        {/* 切手（写真の小片＋ギザ） */}
        <div style={{ position: "absolute", right: 60, top: 62, width: 150, height: 186, background: "#FFF", padding: 8, transform: "scale(" + stampIn + ") rotate(3deg)", boxShadow: "0 8px 22px rgba(0,0,0,0.35)" }}>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, #FFF 0 9px, transparent 9px 12px), repeating-linear-gradient(0deg, #FFF 0 9px, transparent 9px 12px)", pointerEvents: "none" }} />
          <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <Photo src={items[(i + 1) % 4].src} lf={0} seg={1} from={1.1} to={1.1} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", fontFamily: serif, color: "#F6EFE0", fontSize: 15, letterSpacing: 2, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>ITALIA</div>
        </div>
        {/* 消印（二重丸＋波線） */}
        <div style={{ position: "absolute", right: 42, top: 44, width: 186, height: 186, transform: "scale(" + post + ") rotate(-12deg)", opacity: fade(local, 34, 12) }}>
          <div style={{ position: "absolute", inset: 22, borderRadius: "50%", border: "3px solid rgba(48,74,60,0.75)" }} />
          <div style={{ position: "absolute", inset: 34, borderRadius: "50%", border: "1px solid rgba(48,74,60,0.75)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 86, textAlign: "center", fontFamily: serif, color: "rgba(48,74,60,0.8)", fontSize: 17, letterSpacing: 2 }}>OSAKA</div>
        </div>
        {/* 便りの本文 */}
        <div style={{ position: "absolute", left: 52, right: 52, top: 710 }}>
          <div style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600 }}>SALUTI DA NAGAGUTSU</div>
          <div style={{ marginTop: 14, height: 2, background: "rgba(36,26,18,0.2)" }} />
          <div style={{ marginTop: 22 }}>
            <Caption d={items[i]} f={local} start={16} ink="#241A12" sub="rgba(36,26,18,0.78)" accent={T.slab} w={1080 - 156 - 104} shadow={false} maxName={72} />
          </div>
        </div>
        {/* 宛名側の罫（はがきの作法） */}
        <div style={{ position: "absolute", right: 56, bottom: 70, width: 380 }}>
          {[0, 1, 2].map((k) => <div key={k} style={{ height: 1, background: "rgba(36,26,18,0.22)", marginTop: 30 }} />)}
        </div>
        <div style={{ position: "absolute", left: 52, bottom: 60, fontFamily: serif, color: "rgba(36,26,18,0.6)", fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuCartolina: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={9} base="#2A2018" storeName={storeName} handle={handle} theme={theme}>
    <CartolinaBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.19 ヌメリ（数字で見る） ════════════════════════════════════════
   特大のナンバリングで送る。数字が主役の画は既存に無い（⑨は料理名が主役）。 */
const NumeriBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const numY = interpolate(local, [0, 34], [70, 0], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      {/* 写真は右半分の縦長。左に数字を大きく置く */}
      <div style={{ position: "absolute", left: 372, right: 0, top: 0, bottom: 0, overflow: "hidden" }}>
        <Photo src={items[i].src} lf={local} seg={seg} from={1.06} to={1.14} />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, " + T.base + " 0%, " + T.base + "F2 30%, " + T.base + "33 56%, rgba(0,0,0,0) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,5,0.6) 0%, rgba(0,0,0,0) 28%, rgba(10,8,5,0.86) 100%)" }} />
      <Masthead storeName={storeName} f={f} kicker="I NUMERI" accent={T.accent} logoH={78} />
      {/* 特大ナンバー */}
      <div style={{ position: "absolute", left: 58, top: 560, transform: "translateY(" + numY + "px)", opacity: fade(local, 0, 18) }}>
        <div style={{ fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 380, lineHeight: 0.82, fontWeight: 600 }}>{"0" + (i + 1)}</div>
        <div style={{ marginTop: 6, width: 230, height: 4, background: T.slab }} />
        <div style={{ marginTop: 16, fontFamily: serif, color: T.sub, fontSize: 26, letterSpacing: 7, textTransform: "uppercase" }}>{"DI 0" + items.length}</div>
      </div>
      {/* 料理名は縦に読ませる（数字と干渉させない） */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={local} start={14} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={22} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuNumeri: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={5} base="#17110b" storeName={storeName} handle={handle} theme={theme}>
    <NumeriBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.20 テンダ（縞の日除け） ═══════════════════════════════════════
   テラス席の縞ひさしが降りてきて、その下に一皿。昼の外の空気＝既存で唯一の“明るい屋外”。 */
const TendaBody: React.FC<{ storeName: string; handle: string }> = ({ storeName, handle }) => {
  const f = useCurrentFrame();
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const down = interpolate(f, [0, 40], [-360, 0], { ...clamp, easing: EASE });   // ひさしが降りる
  const SCAL = 12;   // 縞の本数
  return (
    <AbsoluteFill style={{ backgroundColor: "#EDE4D3" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.05} to={1.12} bri={1.04} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,16,10,0.5) 0%, rgba(20,16,10,0) 26%, rgba(20,16,10,0.08) 58%, rgba(20,16,10,0.82) 100%)" }} />
      {/* ひさし：縞＋波型の裾 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 360, transform: "translateY(" + down + "px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, " + GREEN + " 0 " + (1080 / SCAL) + "px, " + CREAM + " " + (1080 / SCAL) + "px " + (1080 / SCAL) * 2 + "px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: "rgba(0,0,0,0.25)" }} />
        {/* 裾の波（半円を並べる） */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -34, height: 68, display: "flex" }}>
          {Array.from({ length: SCAL }).map((_, k) => (
            <div key={k} style={{ width: 1080 / SCAL, height: 68, borderRadius: "0 0 50% 50%", background: k % 2 === 0 ? GREEN : CREAM }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(20,16,10,0.34)", padding: "10px 30px" }}>
            <span style={{ fontFamily: serif, color: "#FFF6E8", fontSize: 34, letterSpacing: 10, fontWeight: 600, textTransform: "uppercase" }}>TERRAZZA</span>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 430, left: 0, right: 0, display: "flex", justifyContent: "center", ...rise(f, 40, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={84} />
      </div>
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300, textAlign: "center" }}>
        <Caption d={items[i]} f={local} start={10} ink="#FFF6E8" sub="#E7D9C0" accent="#FFD9A0" align="center" />
      </div>
      <HandleMark handle={handle} accent="#FFD9A0" f={f} start={26} align="center" />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuTenda: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={7} base="#EDE4D3" storeName={storeName} handle={handle} theme={theme}>
    <TendaBody storeName={storeName} handle={handle} />
  </Shell>
);

/* ═══ No.21 メダリオーネ（丸窓の紋章） ═════════════════════════════════
   丸く抜いた皿が回りながら入れ替わる。紋章のような格式で見せる1本。
   円を主役にした動画は既存に無い。 */
const MedaglioneBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const R = 820;
  const spin = interpolate(f, [0, BODY], [0, 26], clamp);                       // ゆっくり回り続ける台座
  const pop = interpolate(local, [0, 28], [0.9, 1], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: "#12100E" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.3} to={1.4} bri={0.3} blur={34} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(60% 40% at 50% 46%, rgba(224,103,58,0.16) 0%, rgba(0,0,0,0.82) 72%)" }} />
      {/* 台座の環（目盛りがゆっくり回る） */}
      <div style={{ position: "absolute", left: (1080 - R - 96) / 2, top: 470 - 48, width: R + 96, height: R + 96, borderRadius: "50%", transform: "rotate(" + spin + "deg)", opacity: 0.7 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid " + T.accent + "66" }} />
        <div style={{ position: "absolute", inset: 22, borderRadius: "50%", border: "3px solid " + T.slab + "AA" }} />
        {Array.from({ length: 36 }).map((_, k) => (
          <div key={k} style={{
            position: "absolute", left: "50%", top: 0, width: 2, height: k % 3 === 0 ? 22 : 11, background: T.accent,
            opacity: 0.7, transformOrigin: "1px " + ((R + 96) / 2) + "px", transform: "rotate(" + (k * 10) + "deg)",
          }} />
        ))}
      </div>
      {/* 丸窓の皿 */}
      <div style={{ position: "absolute", left: (1080 - R) / 2, top: 470, width: R, height: R, borderRadius: "50%", overflow: "hidden", border: "10px solid #F3E7CF", boxShadow: "0 40px 100px rgba(0,0,0,0.7)", transform: "scale(" + pop + ")" }}>
        <Photo src={items[i].src} lf={local} seg={seg} from={1.04} to={1.12} />
      </div>
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", ...rise(f, 6, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={82} />
      </div>
      <div style={{ position: "absolute", top: 336, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 12, fontWeight: 600, opacity: fade(f, 14, 18) }}>{T.label}</div>
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: 1400, textAlign: "center" }}>
        <Caption d={items[i]} f={local} start={14} ink={T.ink} sub={T.sub} accent={T.accent} align="center" />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={26} align="center" />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuMedaglione: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={6} base="#12100E" storeName={storeName} handle={handle} theme={theme}>
    <MedaglioneBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.22 ラヴァーニャ・ノッテ（夜の石壁に白文字） ════════════════════
   ※黒板（既存②）とは別。石壁に直接チョークで書いた“店先の壁書き”。
   料理名が手で書かれるように1文字ずつ現れ、写真は壁に貼った1枚だけ。 */
const MuroBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const nm = nameOf(items[i]);
  const chars = Array.from(nm);
  const size = fitOneLine(nm, 88, 1080 - SAFE.side * 2, 32);
  return (
    <AbsoluteFill style={{ backgroundColor: "#232019" }}>
      {/* 石壁（粗いグラデ＋斑） */}
      <AbsoluteFill style={{ background: "radial-gradient(80% 60% at 40% 30%, #3A342A 0%, #211E19 70%, #16140F 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.16, backgroundImage: "repeating-linear-gradient(28deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 9px), repeating-linear-gradient(-14deg, rgba(0,0,0,0.2) 0 3px, transparent 3px 14px)" }} />
      {/* 壁に留めた1枚（少し傾けて画鋲） */}
      <div style={{ position: "absolute", left: 150, top: 430, width: 780, height: 720, transform: "rotate(-1.4deg)", boxShadow: "0 30px 70px rgba(0,0,0,0.66)", overflow: "hidden", border: "12px solid #EDE6D6" }}>
        <Photo src={items[i].src} lf={local} seg={seg} from={1.04} to={1.11} />
      </div>
      <div style={{ position: "absolute", left: 528, top: 414, width: 22, height: 22, borderRadius: "50%", background: T.slab, boxShadow: "0 4px 10px rgba(0,0,0,0.7)" }} />
      {/* チョークで書かれていく料理名 */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: 1270, textAlign: "center" }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 7, textTransform: "uppercase", fontWeight: 600, opacity: fade(local, 4, 14) }}>{items[i].sub || ""}</div>
        <div style={{ marginTop: 14, whiteSpace: "nowrap" }}>
          {chars.map((c, k) => (
            <span key={k} style={{
              fontFamily: mincho, color: "#F4EFE2", fontSize: size, fontWeight: 700, letterSpacing: 2,
              opacity: fade(local, 16 + k * 3, 10),
              textShadow: "0 0 10px rgba(244,239,226,0.28)",
            }}>{c}</span>
          ))}
        </div>
        <div style={{ margin: "22px auto 0", height: 3, width: interpolate(local, [20, 60], [0, 340], { ...clamp, easing: EASE }), background: "rgba(244,239,226,0.6)" }} />
        {items[i].desc ? (
          <div style={{ marginTop: 20, fontFamily: mincho, color: "#D7CCB6", fontSize: fitLines(items[i].desc || "", 34, 1080 - SAFE.side * 2, 22), lineHeight: 1.44, opacity: fade(local, 44, 18) }}>
            {splitLines(items[i].desc || "").map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", justifyContent: "center", ...rise(f, 6, { dist: 12 }) }}>
        <StoreLogo storeName={storeName} height={80} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={26} align="center" />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
export const YoshokuMuro: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={8} base="#232019" storeName={storeName} handle={handle} theme={theme}>
    <MuroBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.23 パッシオ（覗き窓／扉が開く） ═══════════════════════════════
   両開きの扉が開いて店の中へ入る。カットごとに扉が開き直す＝“通される”感覚。
   画面を割って開く動きは既存に無い。 */
const PassioBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const open = interpolate(local, [0, 40], [0, 1], { ...clamp, easing: EASE });   // 0=閉 1=開
  const half = 540;
  const doorX = open * half;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0F0D0B" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.14} to={1.04} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,5,0.62) 0%, rgba(8,7,5,0.04) 30%, rgba(8,7,5,0.1) 60%, rgba(8,7,5,0.9) 100%)" }} />
      {/* 左右の扉（木の縦板＋真鍮の把手） */}
      {[0, 1].map((s) => (
        <div key={s} style={{
          position: "absolute", top: 0, bottom: 0, width: half,
          left: s === 0 ? 0 : half,
          transform: "translateX(" + (s === 0 ? -doorX : doorX) + "px)",
          background: "repeating-linear-gradient(90deg, #3A2A1C 0 44px, #33241799 44px 48px)",
          boxShadow: s === 0 ? "22px 0 50px rgba(0,0,0,0.6)" : "-22px 0 50px rgba(0,0,0,0.6)",
        }}>
          <div style={{ position: "absolute", inset: 42, border: "3px solid rgba(201,162,75,0.35)" }} />
          <div style={{
            position: "absolute", top: "50%", [s === 0 ? "right" : "left"]: 34, width: 16, height: 120,
            borderRadius: 8, background: "linear-gradient(180deg, #E3C88A, #9C7A3C)",
          } as React.CSSProperties} />
        </div>
      ))}
      {/* 扉が開ききってから中身を出す */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300, opacity: fade(local, 34, 18) }}>
        <Caption d={items[i]} f={local} start={34} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      <Masthead storeName={storeName} f={f} kicker="ENTRATA" accent={T.accent} logoH={78} />
      <HandleMark handle={handle} accent={T.accent} f={f} start={40} />
      <Vignette strength={0.36} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuPassio: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={9} base="#0F0D0B" storeName={storeName} handle={handle} theme={theme}>
    <PassioBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

// 確認アプリ／登録用のひとまとめ（Root.tsx と prepare.py の並びをここに合わせる）
export const NUOVI_COMPS = [
  { id: "YoshokuConto", pattern: "yoshokuconto", label: "No.12 洋食おしゃれ・伝票（コント）", comp: YoshokuConto },
  { id: "YoshokuVicolo", pattern: "yoshokuvicolo", label: "No.13 洋食おしゃれ・路地のネオン", comp: YoshokuVicolo },
  { id: "YoshokuCicchetti", pattern: "yoshokucicchetti", label: "No.14 洋食おしゃれ・カウンター横歩き", comp: YoshokuCicchetti },
  { id: "YoshokuMaiolica", pattern: "yoshokumaiolica", label: "No.15 洋食おしゃれ・陶タイル", comp: YoshokuMaiolica },
  { id: "YoshokuTricolore", pattern: "yoshokutricolore", label: "No.16 洋食おしゃれ・三色帯", comp: YoshokuTricolore },
  { id: "YoshokuProvino", pattern: "yoshokuprovino", label: "No.17 洋食おしゃれ・ベタ焼き", comp: YoshokuProvino },
  { id: "YoshokuCartolina", pattern: "yoshokucartolina", label: "No.18 洋食おしゃれ・絵はがき", comp: YoshokuCartolina },
  { id: "YoshokuNumeri", pattern: "yoshokunumeri", label: "No.19 洋食おしゃれ・数字で見る", comp: YoshokuNumeri },
  { id: "YoshokuTenda", pattern: "yoshokutenda", label: "No.20 洋食おしゃれ・縞の日除け", comp: YoshokuTenda },
  { id: "YoshokuMedaglione", pattern: "yoshokumedaglione", label: "No.21 洋食おしゃれ・丸窓の紋章", comp: YoshokuMedaglione },
  { id: "YoshokuMuro", pattern: "yoshokumuro", label: "No.22 洋食おしゃれ・石壁の壁書き", comp: YoshokuMuro },
  { id: "YoshokuPassio", pattern: "yoshokupassio", label: "No.23 洋食おしゃれ・扉が開く", comp: YoshokuPassio },
];
