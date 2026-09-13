// 洋食おしゃれ「イタリアン酒場」追加8種（No.24〜No.31）。
//
// 既存23種でもう使った小道具・動きは避ける。使用済みなのは：
//   額装カード / 黒板 / 鉄板のシズル / 紙の誌面(雑誌) / レターボックス / ワイングラス /
//   3品スライド / インスタント写真 / 大見出しだけ / OPEN札 / 感熱紙の伝票 / ネオン /
//   横パン / 陶タイル / 三色帯 / ベタ焼き / 絵はがき / 特大ナンバー / 縞ひさし /
//   丸窓 / 石壁の壁書き / 両開きの扉
// ここで新しく持ち込む軸は「時間（曜日・通い）」「ピント」「回転」「拍」「ガラス越し」
// 「ボトルのラベル」「斜めのリボン」。
//
// 共通ルール（他の動画と揃える）は YoshokuNuovi.tsx と同じ部品をそのまま使う：
//   Shell（OP→本編→CLOSE・音楽）／Caption（伊語サブ30・料理名・説明文36）／
//   Photo（弱いケンバーンズ）／Masthead（左上ロゴ）／HandleMark（左下ハンドル）
//
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, EASE_INOUT, fade, rise, Grain, Vignette,
  Masthead, HandleMark, fitOneLine, splitLines, segNow, SAFE,
} from "./yoshokuDesign";
import { BODY, Shell, Caption, Photo, PaperLogo, dishes, nameOf } from "./YoshokuNuovi";

type P = { storeName?: string; handle?: string; theme?: string };
const D = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };

const CREAM = "#F4EEE2";

/* ═══ No.24 セッティマーナ（今週の一皿） ═══════════════════════════════
   曜日の枡が並び、今日の枡だけが灯って、その日の皿へ寄る。
   “時間”を画に出すテンプレは既存に無い（OPEN案内は開店の告知で曜日は出ない）。 */
const DAYS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const SettimanaBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const on = i + 2;                                  // 灯る枡（カットごとに1つ進む）
  const CW = 128, GAP = 12;
  const gw = DAYS.length * CW + (DAYS.length - 1) * GAP;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.08} to={1.16} bri={0.9} /></AbsoluteFill>
      {/* 明るい料理（オイルサーディンのような黄色い皿）だと白文字が飛ぶので、
          文字の載る帯＝上（ロゴ〜曜日の枡）と下（料理名）だけを濃くする。
          真ん中は暗くしない＝料理は明るいまま見せる。 */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,5,0.9) 0%, rgba(10,8,5,0.72) 20%, rgba(10,8,5,0.6) 34%, rgba(10,8,5,0.12) 48%, rgba(10,8,5,0.1) 60%, rgba(10,8,5,0.6) 76%, rgba(10,8,5,0.96) 100%)" }} />
      <Masthead storeName={storeName} f={f} kicker="LA SETTIMANA" accent={T.accent} logoH={78} />
      {/* 曜日の枡（灯った枡だけテラコッタで塗る） */}
      <div style={{ position: "absolute", left: (1080 - gw) / 2, top: 430, display: "flex", gap: GAP }}>
        {DAYS.map((d, k) => {
          const lit = k === on;
          const pop = lit ? interpolate(local, [0, 18], [0.92, 1], { ...clamp, easing: EASE }) : 1;
          return (
            <div key={k} style={{
              width: CW, height: 104, display: "flex", alignItems: "center", justifyContent: "center",
              background: lit ? T.slab : "rgba(246,239,224,0.09)",
              border: "1px solid " + (lit ? T.accent : "rgba(246,239,224,0.22)"),
              transform: "scale(" + pop + ")",
            }}>
              <span style={{ fontFamily: serif, color: lit ? "#FFF6E8" : "rgba(246,239,224,0.6)", fontSize: 26, letterSpacing: 3, fontWeight: 600 }}>{d}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 576, textAlign: "center", fontFamily: mincho, color: T.ink, fontSize: 28, letterSpacing: 8, textShadow: "0 3px 18px rgba(0,0,0,0.8)", opacity: fade(f, 20, 20) }}>今週の一皿</div>
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={local} start={10} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={26} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuSettimana: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={5} base="#17110b" storeName={storeName} handle={handle} theme={theme}>
    <SettimanaBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.25 エティケッタ（ボトルのラベル） ═════════════════════════════
   ワインのラベルの体裁（細い二重枠・紋章・年号・産地）で料理名を組む。
   既存⑥はグラスとペアリングの話。ここは“ラベルの紙面”そのもの。 */
const EtichettaBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const year = new Date().getFullYear();
  const grow = interpolate(local, [0, 26], [0.94, 1], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: "#1A1410" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.16} to={1.24} bri={0.46} blur={16} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(58% 40% at 50% 52%, rgba(0,0,0,0.1) 0%, rgba(12,9,7,0.86) 78%)" }} />
      {/* ラベル本体（生成りの紙） */}
      <div style={{
        position: "absolute", left: 150, right: 150, top: 380, height: 1140, background: "#F4EDDD",
        boxShadow: "0 36px 90px rgba(0,0,0,0.66)", transform: "scale(" + grow + ")", opacity: fade(local, 0, 16),
      }}>
        <div style={{ position: "absolute", inset: 22, border: "2px solid " + T.slab }} />
        <div style={{ position: "absolute", inset: 34, border: "1px solid rgba(36,26,18,0.35)" }} />
        {/* 上部の紋章＝店ロゴ */}
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <PaperLogo storeName={storeName} h={70} />
        </div>
        <div style={{ position: "absolute", top: 168, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 10, fontWeight: 600 }}>OSTERIA · DAL 2011</div>
        <div style={{ position: "absolute", top: 218, left: 120, right: 120, height: 1, background: "rgba(36,26,18,0.3)" }} />
        {/* 中央：料理の窓（ラベルに刷られた銅版画の見立て） */}
        <div style={{ position: "absolute", left: 92, right: 92, top: 258, height: 460, overflow: "hidden", border: "1px solid rgba(36,26,18,0.3)" }}>
          <Photo src={items[i].src} lf={local} seg={seg} from={1.04} to={1.1} />
        </div>
        {/* 下部：料理名と年号 */}
        <div style={{ position: "absolute", left: 92, right: 92, top: 768, textAlign: "center" }}>
          <Caption d={items[i]} f={local} start={14} ink="#241A12" sub="rgba(36,26,18,0.78)" accent={T.slab}
            w={1080 - 300 - 184} align="center" shadow={false} maxName={70} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, textAlign: "center", fontFamily: serif, color: T.slab, fontSize: 44, letterSpacing: 10, fontWeight: 600 }}>{year}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", fontFamily: serif, color: "rgba(36,26,18,0.6)", fontSize: 22, letterSpacing: 5 }}>{handle}</div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuEtichetta: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={7} base="#1A1410" storeName={storeName} handle={handle} theme={theme}>
    <EtichettaBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.26 フオーコ（ピントが合う） ═══════════════════════════════════
   大きくボケた状態から、スッと料理にピントが合う。文字も一緒に解像する。
   “ボケ→合焦”を主役にした画は既存に無い（ぼかしは背景用にしか使っていない）。 */
const FuocoBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const bl = interpolate(local, [0, 34], [26, 0], { ...clamp, easing: EASE });      // 合焦
  const tb = interpolate(local, [10, 44], [14, 0], { ...clamp, easing: EASE });     // 文字も遅れて解像
  const ring = interpolate(local, [0, 34], [1.18, 1], { ...clamp, easing: EASE });
  const ringO = interpolate(local, [0, 26, 40], [0.5, 0.5, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.1} to={1.04} blur={bl} /></AbsoluteFill>
      {/* 上下の帯だけ濃くする（明るい皿でロゴ下の伊語・料理名が飛ぶのを防ぐ）。真ん中は素のまま */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,5,0.86) 0%, rgba(10,8,5,0.62) 16%, rgba(10,8,5,0.06) 32%, rgba(10,8,5,0.08) 58%, rgba(10,8,5,0.6) 76%, rgba(10,8,5,0.96) 100%)" }} />
      {/* ファインダーの枠（合焦すると消える） */}
      <div style={{ position: "absolute", left: 180, right: 180, top: 560, height: 700, opacity: ringO, transform: "scale(" + ring + ")" }}>
        {[[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].map((c, k) => (
          <div key={k} style={{
            position: "absolute", width: 64, height: 64,
            left: c[0] ? "auto" : 0, right: c[0] ? 0 : "auto",
            top: c[1] ? "auto" : 0, bottom: c[1] ? 0 : "auto",
            borderTop: c[3] > 0 ? "3px solid " + T.accent : "none",
            borderBottom: c[3] < 0 ? "3px solid " + T.accent : "none",
            borderLeft: c[2] > 0 ? "3px solid " + T.accent : "none",
            borderRight: c[2] < 0 ? "3px solid " + T.accent : "none",
          }} />
        ))}
      </div>
      <Masthead storeName={storeName} f={f} kicker="A FUOCO" accent={T.accent} logoH={78} />
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300, filter: "blur(" + tb + "px)" }}>
        <Caption d={items[i]} f={local} start={8} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={24} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuFuoco: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={6} base="#17110b" storeName={storeName} handle={handle} theme={theme}>
    <FuocoBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.27 ジラピアット（皿が回る） ═══════════════════════════════════
   円卓に載った皿が回って正面を向く。回転で見せるテンプレは洋食系に無い。 */
const GiraBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const R = 880;
  // 回して止める（1カットで半回転ぶん送って、ゆっくり止まる）
  const rot = interpolate(local, [0, 52], [-52, 0], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: "#141009" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.3} to={1.38} bri={0.28} blur={32} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(56% 36% at 50% 50%, rgba(224,103,58,0.14) 0%, rgba(8,6,4,0.88) 74%)" }} />
      {/* 円卓の天板 */}
      <div style={{ position: "absolute", left: (1080 - R - 120) / 2, top: 520 - 60, width: R + 120, height: R + 120, borderRadius: "50%", background: "radial-gradient(60% 60% at 42% 36%, #3B2C1E 0%, #241A12 70%, #1A120C 100%)", boxShadow: "0 50px 120px rgba(0,0,0,0.7)" }} />
      {/* 皿（回って止まる） */}
      <div style={{ position: "absolute", left: (1080 - R) / 2, top: 520, width: R, height: R, borderRadius: "50%", overflow: "hidden", transform: "rotate(" + rot + "deg)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <Photo src={items[i].src} lf={local} seg={seg} from={1.02} to={1.06} />
      </div>
      {/* 皿のふち（回らない＝皿だけ回っているように見える） */}
      <div style={{ position: "absolute", left: (1080 - R) / 2 - 10, top: 510, width: R + 20, height: R + 20, borderRadius: "50%", border: "10px solid #EFE3CB", opacity: 0.9 }} />
      <Masthead storeName={storeName} f={f} kicker="GIRAPIATTO" accent={T.accent} logoH={78} />
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: 1500, textAlign: "center" }}>
        <Caption d={items[i]} f={local} start={20} ink={T.ink} sub={T.sub} accent={T.accent} align="center" />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={30} align="center" />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuGira: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={4} base="#141009" storeName={storeName} handle={handle} theme={theme}>
    <GiraBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.28 テッセラ（スタンプカード） ═════════════════════════════════
   10マスに印が増えていく“通いたくなる”1本。訴求の中身が他と違う
   （他は全部「今日の皿」の紹介。これは常連づくり）。 */
const TesseraBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const SLOT = 10;
  const stamped = Math.min(SLOT, Math.floor(interpolate(f, [40, BODY - 40], [0, SLOT], clamp)));
  return (
    <AbsoluteFill style={{ backgroundColor: "#1B1510" }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.14} to={1.22} bri={0.42} blur={12} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,9,6,0.8) 0%, rgba(12,9,6,0.44) 40%, rgba(12,9,6,0.9) 100%)" }} />
      {/* カード */}
      <div style={{ position: "absolute", left: 110, right: 110, top: 430, height: 980, background: "#F6F0E2", boxShadow: "0 36px 86px rgba(0,0,0,0.6)", transform: "rotate(-1deg)" }}>
        <div style={{ position: "absolute", inset: 20, border: "2px dashed rgba(36,26,18,0.28)" }} />
        <div style={{ position: "absolute", top: 54, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <PaperLogo storeName={storeName} h={62} />
        </div>
        <div style={{ position: "absolute", top: 146, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 8, fontWeight: 600 }}>TESSERA · 10 VOLTE</div>
        {/* 押印の枡 */}
        <div style={{ position: "absolute", left: 70, right: 70, top: 230, display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
          {Array.from({ length: SLOT }).map((_, k) => {
            const hit = k < stamped;
            const sc = hit ? interpolate(f, [40 + k * 30, 40 + k * 30 + 10], [1.7, 1], { ...clamp, easing: EASE }) : 1;
            return (
              <div key={k} style={{ width: 140, height: 140, borderRadius: "50%", border: "2px solid rgba(36,26,18,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {hit ? (
                  <div style={{
                    width: 112, height: 112, borderRadius: "50%", border: "4px solid " + T.slab, color: T.slab,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: serif, fontSize: 34, fontWeight: 700, letterSpacing: 1,
                    transform: "scale(" + sc + ") rotate(" + (k % 2 ? 7 : -6) + "deg)",
                  }}>{k + 1}</div>
                ) : <span style={{ fontFamily: serif, color: "rgba(36,26,18,0.3)", fontSize: 30 }}>{k + 1}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 118, textAlign: "center", fontFamily: mincho, color: "#241A12", fontSize: 40, fontWeight: 700, letterSpacing: 3 }}>10回目、一皿ごちそうします</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 62, textAlign: "center", fontFamily: serif, color: "rgba(36,26,18,0.6)", fontSize: 24, letterSpacing: 4 }}>{handle}</div>
      </div>
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 250, textAlign: "center", ...rise(f, 30, { dist: 14 }) }}>
        <span style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 7, textTransform: "uppercase" }}>{nameOf(items[i])}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuTessera: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={8} base="#1B1510" storeName={storeName} handle={handle} theme={theme}>
    <TesseraBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.29 バッティート（拍で刻む） ══════════════════════════════════
   短いカットを連ねて拍で止める。1品あたり複数の寄りを刻むので、
   既存のどれよりもテンポが速い（⑯三色帯は帯が主役、こちらは寄りの刻み）。 */
const BattitoBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const BEAT = 25;                                   // 25フレーム＝約0.83秒ごとに刻む
  const b = Math.floor(f / BEAT);
  const d = items[b % items.length];
  const lb = f - b * BEAT;
  // 拍ごとに寄り位置を変える（同じ皿でも別のカットに見える）
  const POS = ["50% 50%", "30% 35%", "70% 60%", "50% 28%"];
  const pop = interpolate(lb, [0, 8], [1.1, 1.02], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: "#100D0A" }}>
      <AbsoluteFill>
        <Img src={d.src ? staticFile(d.src) : ""} style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: POS[b % POS.length],
          transform: "scale(" + pop + ")", filter: "brightness(1.02) saturate(1.16) contrast(1.06)",
        }} />
      </AbsoluteFill>
      {/* 拍の頭だけ一瞬明るく＝刻みが目で分かる */}
      <AbsoluteFill style={{ background: "#FFF", opacity: interpolate(lb, [0, 4], [0.16, 0], clamp) }} />
      {/* 上下の帯だけ濃くする（明るい皿でロゴ下の伊語・料理名が飛ぶのを防ぐ）。真ん中は素のまま */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,5,0.86) 0%, rgba(8,7,5,0.62) 16%, rgba(8,7,5,0.04) 32%, rgba(8,7,5,0.08) 58%, rgba(8,7,5,0.6) 76%, rgba(8,7,5,0.96) 100%)" }} />
      <Masthead storeName={storeName} f={f} kicker="A TEMPO" accent={T.accent} logoH={78} />
      {/* 料理名は拍ごとに出し直す（切り替わりが気持ちいい） */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 320 }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, opacity: fade(lb, 2, 8) }}>{d.sub || ""}</div>
        <div style={{ marginTop: 8, fontFamily: mincho, color: T.ink, fontSize: fitOneLine(nameOf(d), 84, 1080 - SAFE.side * 2, 30), fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap", textShadow: "0 3px 22px rgba(0,0,0,0.55)", opacity: fade(lb, 3, 8) }}>{nameOf(d)}</div>
      </div>
      {/* 拍のカウンター（4つ玉） */}
      <div style={{ position: "absolute", left: SAFE.side, bottom: 254, display: "flex", gap: 10 }}>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={{ width: 14, height: 14, borderRadius: 7, background: k === b % 4 ? T.accent : "rgba(246,239,224,0.28)" }} />
        ))}
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={20} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
export const YoshokuBattito: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={8} base="#100D0A" storeName={storeName} handle={handle} theme={theme}>
    <BattitoBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.30 ヴェトロ（雨のガラス越し） ═════════════════════════════════
   濡れた窓の外から店内を覗く。滴の筋が伝い、拭った跡から料理が見える。
   ガラス越しの湿り気を出す1本は既存に無い（⑬は乾いた路地のネオン）。 */
const VetroBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const wipe = interpolate(local, [6, 46], [0, 1], { ...clamp, easing: EASE_INOUT });   // 拭った跡が広がる
  const drops = [
    { x: 140, d: 0, w: 3, h: 220 }, { x: 330, d: 14, w: 2, h: 300 }, { x: 520, d: 6, w: 4, h: 180 },
    { x: 700, d: 22, w: 2, h: 260 }, { x: 890, d: 10, w: 3, h: 240 }, { x: 980, d: 30, w: 2, h: 200 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0D0C0B" }}>
      {/* 曇ったガラス越しの店内 */}
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.12} to={1.18} bri={0.62} blur={20} /></AbsoluteFill>
      {/* 拭った跡＝中央の楕円だけ鮮明になる */}
      <AbsoluteFill style={{
        WebkitMaskImage: "radial-gradient(46% 30% at 50% 52%, #000 0%, #000 " + Math.round(wipe * 62) + "%, transparent " + Math.round(wipe * 62 + 22) + "%)",
        maskImage: "radial-gradient(46% 30% at 50% 52%, #000 0%, #000 " + Math.round(wipe * 62) + "%, transparent " + Math.round(wipe * 62 + 22) + "%)",
      }}>
        <Photo src={items[i].src} lf={local} seg={seg} from={1.12} to={1.18} bri={1.0} />
      </AbsoluteFill>
      {/* 滴の筋 */}
      {drops.map((dp, k) => {
        const y = interpolate((f + dp.d * 7) % 240, [0, 240], [-320, 2000], clamp);
        return <div key={k} style={{ position: "absolute", left: dp.x, top: y, width: dp.w, height: dp.h, background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.26), rgba(255,255,255,0.02))", filter: "blur(1px)" }} />;
      })}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,8,8,0.74) 0%, rgba(8,8,8,0.12) 32%, rgba(8,8,8,0.2) 62%, rgba(8,8,8,0.92) 100%)" }} />
      <Vignette strength={0.44} />
      <Masthead storeName={storeName} f={f} kicker="DALLA VETRINA" accent={T.accent} logoH={78} />
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300 }}>
        <Caption d={items[i]} f={local} start={16} ink={T.ink} sub={T.sub} accent={T.accent} />
      </div>
      <HandleMark handle={handle} accent={T.accent} f={f} start={28} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
export const YoshokuVetro: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={6} base="#0D0C0B" storeName={storeName} handle={handle} theme={theme}>
    <VetroBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

/* ═══ No.31 ナストロ（斜めのリボン帯） ════════════════════════════════
   斜めのリボンが走って看板商品を宣言する。⑯の三色帯は縦に走る切り替え、
   こちらは斜めに掛かって残る“帯の宣言”＝役目も見た目も別。 */
const NastroBody: React.FC<Required<P>> = ({ storeName, handle, theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const items = dishes(4);
  const { i, local, seg } = segNow(BODY, 4, f);
  const inX = interpolate(local, [0, 30], [-1500, 0], { ...clamp, easing: EASE });
  const nm = nameOf(items[i]);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <AbsoluteFill><Photo src={items[i].src} lf={local} seg={seg} from={1.04} to={1.12} /></AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,8,5,0.66) 0%, rgba(10,8,5,0.02) 26%, rgba(10,8,5,0.1) 56%, rgba(10,8,5,0.72) 82%, rgba(10,8,5,0.94) 100%)" }} />
      {/* 斜めのリボン（左下→右上に掛かる） */}
      <div style={{ position: "absolute", left: -140, right: -140, top: 820, transform: "translateX(" + inX + "px) rotate(-11deg)" }}>
        <div style={{ height: 176, background: T.slab, boxShadow: "0 18px 46px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: mincho, color: "#FFF6E8", fontSize: fitOneLine(nm, 82, 1180, 34), fontWeight: 700, letterSpacing: 2, whiteSpace: "nowrap", textShadow: "0 3px 16px rgba(0,0,0,0.4)" }}>{nm}</span>
        </div>
        {/* リボンの上下に細い生成りの縁 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: -8, height: 6, background: CREAM, opacity: 0.85 }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -8, height: 6, background: CREAM, opacity: 0.85 }} />
      </div>
      {/* 伊語サブは帯のすぐ上に、濃い下敷きを敷いて置く。
          明るい写真に直に置くと（実際そうなっていて）字が飛んで読めないため。 */}
      <div style={{ position: "absolute", left: SAFE.side, top: 730, opacity: fade(local, 24, 16) }}>
        <span style={{ display: "inline-block", background: "rgba(12,9,6,0.6)", padding: "8px 20px", fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600 }}>{items[i].sub || ""}</span>
      </div>
      {/* 説明文は足元の暗いところへ（グラデが効いている高さ）。 */}
      {items[i].desc ? (
        <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 300, fontFamily: mincho, color: T.ink, fontSize: 34, lineHeight: 1.44, letterSpacing: 1, textShadow: "0 3px 22px rgba(0,0,0,0.75)", opacity: fade(local, 34, 18) }}>
          {splitLines(items[i].desc || "").map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
        </div>
      ) : null}
      <Masthead storeName={storeName} f={f} kicker="IL NOSTRO PIATTO" accent={T.accent} logoH={78} />
      <HandleMark handle={handle} accent={T.accent} f={f} start={26} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
export const YoshokuNastro: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => (
  <Shell v={9} base="#17110b" storeName={storeName} handle={handle} theme={theme}>
    <NastroBody storeName={storeName} handle={handle} theme={theme} />
  </Shell>
);

// 登録用のひとまとめ（Root.tsx と prepare.py の並びをここに合わせる）
export const NUOVI2_COMPS = [
  { id: "YoshokuSettimana", pattern: "yoshokusettimana", label: "No.24 洋食おしゃれ・今週の一皿", comp: YoshokuSettimana },
  { id: "YoshokuEtichetta", pattern: "yoshokuetichetta", label: "No.25 洋食おしゃれ・ボトルのラベル", comp: YoshokuEtichetta },
  { id: "YoshokuFuoco", pattern: "yoshokufuoco", label: "No.26 洋食おしゃれ・ピントが合う", comp: YoshokuFuoco },
  { id: "YoshokuGira", pattern: "yoshokugira", label: "No.27 洋食おしゃれ・皿が回る", comp: YoshokuGira },
  { id: "YoshokuTessera", pattern: "yoshokutessera", label: "No.28 洋食おしゃれ・スタンプカード", comp: YoshokuTessera },
  { id: "YoshokuBattito", pattern: "yoshokubattito", label: "No.29 洋食おしゃれ・拍で刻む", comp: YoshokuBattito },
  { id: "YoshokuVetro", pattern: "yoshokuvetro", label: "No.30 洋食おしゃれ・雨のガラス越し", comp: YoshokuVetro },
  { id: "YoshokuNastro", pattern: "yoshokunastro", label: "No.31 洋食おしゃれ・斜めのリボン帯", comp: YoshokuNastro },
];
