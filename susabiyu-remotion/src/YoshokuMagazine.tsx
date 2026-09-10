// 洋食⑪雑誌ストーリー：OP/CLOSE案9（雑誌の表紙／裏表紙）と本編まで同じ“紙の誌面”で揃えた1本。
// 他テンプレが暗い画面の上に写真を敷くのに対し、これは終始クリームの紙の上に誌面を組む。
//   表紙(OP) → 本文ページ(4品) → 裏表紙(CLOSE)
//
// ★本文は「1つの型を4回」ではなく、実際の雑誌のように毎ページ組み方を変える。
//   オーナーが10案から選んだ4案を、この順で並べている。
//   01 案11 フィード案Eそのまま : 全面写真＋左のテラコッタ帯（掴みの1ページ）
//   02 案02 左右分割           : 右に縦長の写真、左に縦組みの料理名（和文誌面の作法）
//   03 案07 全面写真＋角の小札  : 左上にブーツロゴ、右下にキャプションの小札
//   04 案10 引用主役           : 鉤括弧の枠に料理名とキャプション、下に色付き文字ロゴ
//   紙の地・二重罫・柱(誌名)・ノンブル・奥付帯はページをまたいで出しっぱなし＝“一冊”に見せる。
//   ただし1ページ目(案11)だけは全面の別デザインなので、この“器”は出さない。
//
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart, typoLogoColor, typoLogoRound } from "./typoData";
import { YoshokuFeedEAt } from "./YoshokuFeed";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, fade, Grain, Slides, fitOneLine, fitLines, splitLines, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MAGZ_BODY = 480; // 16s（4ページ×4s）
// No.4 と同じく OP を +2秒 / CLOSE を -2秒（総尺24秒は据え置き）。
// 表紙(案9)に「今号の見出し」＝4品の一覧を載せているため、既定の3秒では
// 最終行が書き終わる前に表紙が消え始めていた（4行目の完了94フレーム > 消え始め74フレーム）。
// 各要素の出現タイミング・速度は変えず、表紙を見せる時間だけ延ばす。
const MAGZ_OPEN = STORY_OPEN + 60;   // 90 → 150 フレーム（3.0秒 → 5.0秒）
const MAGZ_END = STORY_END - 60;     // 150 → 90 フレーム（5.0秒 → 3.0秒）
export const YMAGZ_DUR = MAGZ_OPEN + MAGZ_BODY + MAGZ_END;   // 150+480+90 = 720 = 24.0秒（据え置き）

// 案9と同じ紙の色（表紙・本文・裏表紙で同一にすることで“一冊”に見せる）
const PAPER = "#F3E7CF";
const PAPER_D = "#E7D5B2";
const INK = "#241A12";
const INK_SOFT = "rgba(36,26,18,0.82)";

type Item = { src?: string; caption?: string; sub?: string; disp?: string; desc?: string };

function dishName(it: Item): string {
  const nm = (it.disp && it.disp.length) ? it.disp : (it.caption || "");
  return nm.replace(/[｜\n]/g, "");   // 料理名は必ず1行
}

// 縦組みの料理名を1列に収めるサイズ。
// 以前は floor(availH / 文字数) だけで決めていたが、字と字の間に letterSpacing が
// 4pxずつ入るぶんを勘定していなかった。そのため長い名前（13文字以上）は実際の高さが
// 枠を超えて2列に折り返していた（例「イカスミリゾットのアランチーニ」15文字＝930px > 880px）。
const VERT_H = 880;   // 縦組みに使える高さ
const VERT_LS = 4;    // letterSpacing
function vertSize(name: string): number {
  const n = Math.max(1, Array.from(name).length);
  return Math.max(26, Math.min(78, Math.floor(VERT_H / n) - VERT_LS));
}

// 誌面に載せる写真（ケンバーンズはごく弱く。紙面なので暴れさせない）。
const Plate: React.FC<{ src?: string; lf: number; seg: number; radius?: number; style?: React.CSSProperties }> =
  ({ src, lf, seg, radius, style }) => {
    const z = interpolate(lf, [0, seg], [1.0, 1.05], clamp);
    if (!src) return null;
    return (
      <Img src={staticFile(src)} style={{
        width: "100%", height: "100%", objectFit: "cover", borderRadius: radius,
        transform: "scale(" + z + ")",
        filter: "brightness(1.06) saturate(1.12) contrast(1.04)",
        ...style,
      }} />
    );
  };

// 説明文（誌面の本文）。｜で割られた行をそのまま、いちばん長い行に合わせて1行ずつ置く。
const Body: React.FC<{ text?: string; usableW: number; maxPx?: number; align?: "left" | "center"; color?: string }> =
  ({ text, usableW, maxPx = 34, align = "left", color = INK_SOFT }) => {
    if (!text) return null;
    return (
      <div style={{
        fontFamily: mincho, color, letterSpacing: 1, lineHeight: 1.5, textAlign: align,
        fontSize: fitLines(text, maxPx, usableW, 20),
      }}>
        {splitLines(text).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
      </div>
    );
  };

// 欧文（Cormorant大文字＋字送り）を枠幅に収めるサイズを出す。
// 1文字あたりの実測はおよそ「字面0.55em＋letterSpacing」。長い伊語名でも折り返させない。
function fitLatin(text: string, maxPx: number, usableW: number, ls = 6, minPx = 15): number {
  const n = Math.max(1, (text || "").length);
  const px = Math.floor((usableW / n - ls) / 0.55);
  return Math.max(minPx, Math.min(maxPx, px));
}

// 欧文サブ（Cormorant・小・大文字）＝誌面の“肩見出し”。必ず1行に収める。
const Kick: React.FC<{ text?: string; color: string; align?: "left" | "center"; size?: number; usableW?: number }> =
  ({ text, color, align = "left", size = 26, usableW = 1080 - 232 }) => (
    text ? (
      <div style={{
        fontFamily: serif, color, fontSize: fitLatin(text, size, usableW), letterSpacing: 6,
        textTransform: "uppercase", fontWeight: 600, textAlign: align, whiteSpace: "nowrap",
      }}>{text}</div>
    ) : null
  );

// 色付きの文字ロゴ／ブーツロゴ。紙の地に置くので落ち影は焦茶の薄いもの
// （黒だと紙から浮きすぎて印刷物に見えない）。未取得なら描かない＝レイアウトを壊さない。
const WordLogo: React.FC<{ h: number; o?: number }> = ({ h, o = 1 }) => (
  typoLogoColor ? (
    <Img src={staticFile(typoLogoColor)} style={{
      height: h, width: "auto", maxWidth: 760, objectFit: "contain", opacity: o,
      filter: "drop-shadow(0 4px 14px rgba(60,35,14,0.22))",
    }} />
  ) : null
);
const BootLogo: React.FC<{ size: number; o?: number }> = ({ size, o = 1 }) => (
  typoLogoRound ? (
    <Img src={staticFile(typoLogoRound)} style={{
      width: size, height: size, objectFit: "contain", opacity: o,
      filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.45))",
    }} />
  ) : null
);

// ── 01 案11：フィード案E をそのまま1ページに（全面写真＋左のテラコッタ帯）──
// 組み方は E 本体のものを使う（作り直すと似て非なるものになるため）。
// 写真だけ Plate に差し替えて、他ページと同じごく弱いケンバーンズを効かせる。
const Page11: React.FC<{ it: Item; lf: number; seg: number; storeName: string; handle: string; theme: string }> =
  ({ it, lf, seg, storeName, handle, theme }) => (
    <YoshokuFeedEAt storeName={storeName} handle={handle} theme={theme} it={it}
      photo={<Plate src={it.src} lf={lf} seg={seg} />} />
  );

// ── 02 左右分割：右に縦長の写真、左に縦組みの料理名（和文誌面の作法）──
const PageB: React.FC<{ it: Item; lf: number; seg: number; slab: string }> = ({ it, lf, seg, slab }) => {
  const name = dishName(it);
  const vSize = vertSize(name);
  return (
    <>
      {/* 写真の左端 452→320（縦組みの料理名から50pxのすき間を残す）。幅 540→672px。 */}
      <div style={{ position: "absolute", left: 320, right: 88, top: 248, height: 1140, overflow: "hidden", boxShadow: "0 28px 64px rgba(60,35,14,0.32)" }}>
        <Plate src={it.src} lf={lf} seg={seg} />
      </div>
      {/* 左の柱：縦組みの料理名。右から左へ読む向き（writing-mode: vertical-rl）。 */}
      <div style={{ position: "absolute", left: 150, top: 268, height: VERT_H, display: "flex", alignItems: "flex-start", gap: 18 }}>
        {/* nowrap … 万一はみ出しても2列に割らない（料理名は必ず1列で読ませる） */}
        <div style={{ writingMode: "vertical-rl", whiteSpace: "nowrap", fontFamily: mincho, color: INK, fontSize: vSize, fontWeight: 700, letterSpacing: VERT_LS, lineHeight: 1 }}>{name}</div>
        <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: slab, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, marginTop: 6 }}>{it.sub || ""}</div>
      </div>
      <div style={{ position: "absolute", left: 150, top: 1180, width: 140, height: 3, background: slab }} />
      <div style={{ position: "absolute", left: 116, right: 116, top: 1450 }}>
        <Body text={it.desc} usableW={1080 - 232} />
      </div>
      {/* 説明文(〜1552)と奥付帯(1816〜)の間の空きに色付きの文字ロゴ */}
      <div style={{ position: "absolute", left: 116, right: 116, top: 1584, display: "flex", justifyContent: "center" }}>
        <WordLogo h={150} o={fade(lf, 30, 22)} />
      </div>
    </>
  );
};

// ── 03 案07：全面写真＋角の小札。左上にブーツロゴ、右下にキャプションの小札 ──
const Page07: React.FC<{ it: Item; lf: number; seg: number; slab: string }> = ({ it, lf, seg, slab }) => {
  const name = dishName(it);
  const CW = 640 - 60;   // 小札の内寸
  return (
    <>
      <div style={{ position: "absolute", inset: 60, overflow: "hidden" }}>
        <Plate src={it.src} lf={lf} seg={seg} />
      </div>
      {/* 写真の角(60,60)から32px内側。写真が全面なので落ち影で浮かせる。 */}
      <div style={{ position: "absolute", left: 92, top: 92, opacity: fade(lf, 10, 20) }}><BootLogo size={220} /></div>
      <div style={{ position: "absolute", right: 92, bottom: 168, width: 640, background: "#FBF5E9", padding: "24px 30px 28px", boxShadow: "0 20px 50px rgba(60,35,14,0.40)", opacity: fade(lf, 18, 22) }}>
        <Kick text={it.sub} color={slab} size={22} usableW={CW} />
        <div style={{ marginTop: 8, fontFamily: mincho, color: INK, fontSize: fitOneLine(name, 54, CW, 24), fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ width: 72, height: 3, background: slab, margin: "16px 0 14px" }} />
        <Body text={it.desc} usableW={CW} maxPx={26} />
      </div>
    </>
  );
};

// ── 04 案10：引用主役。鉤括弧の枠に料理名とキャプションを収め、下に色付きの文字ロゴ ──
const Page10: React.FC<{ it: Item; lf: number; seg: number; slab: string }> = ({ it, lf, seg, slab }) => {
  const name = dishName(it);
  const W = 1080 - 232 - 56;   // 枠の内寸（左右28pxずつの余白ぶんを引く）
  const lines = splitLines(it.desc || "");
  const q = lines[0] || name;
  // 枠の下端は写真の上端(640)を越えられない。2行のときは字を小さくして食い込みを防ぐ。
  const qMax = lines.length >= 2 ? 40 : 50;
  return (
    <>
      <div style={{ position: "absolute", left: 116, right: 116, top: 210, textAlign: "center", opacity: fade(lf, 8, 22) }}>
        <div style={{ textAlign: "left", fontFamily: mincho, color: slab, fontSize: 96, lineHeight: 0.8, opacity: 0.5 }}>「</div>
        <div style={{ paddingLeft: 28, paddingRight: 28 }}>
          <Kick text={it.sub} color={slab} align="center" usableW={W} />
          <div style={{ marginTop: 8, fontFamily: mincho, color: INK, fontSize: fitOneLine(name, 56, W, 26), fontWeight: 700, letterSpacing: 2, lineHeight: 1.15, whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ width: 96, height: 3, background: slab, margin: "16px auto 18px" }} />
          <div style={{ fontFamily: mincho, color: INK, fontSize: fitLines(q, qMax, W, 24), fontWeight: 700, letterSpacing: 2, lineHeight: 1.4 }}>
            {(lines.length ? lines : [q]).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: mincho, color: slab, fontSize: 96, lineHeight: 0.6, opacity: 0.5 }}>」</div>
      </div>
      {/* 写真は左右いっぱいの帯（二重罫を跨いで断ち切る＝誌面のアクセント） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, height: 830, overflow: "hidden" }}>
        <Plate src={it.src} lf={lf} seg={seg} />
      </div>
      {/* 写真(〜1470)と奥付帯(1816〜)の間346pxに、色付きの文字ロゴを中央・大きく */}
      <div style={{ position: "absolute", left: 116, right: 116, top: 1520, display: "flex", justifyContent: "center" }}>
        <WordLogo h={230} o={fade(lf, 26, 22)} />
      </div>
    </>
  );
};

const MagazineBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = MAGZ_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", sub: "", disp: "", desc: "" }];
  const items: Item[] = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const { i, seg } = segNow(DUR, 4, f);

  // 1ページ目(案11)は全面の別デザインなので“誌面の器”を出さない。2ページ目に切り替わる
  // クロスディゾルブ（Slides の fade=22 と同じ窓）に合わせて器を立ち上げる＝唐突に出ない。
  const XF = 22;
  const chrome = interpolate(f, [seg - XF, seg], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 34%, " + PAPER + " 0%, " + PAPER_D + " 100%)", fontFamily: mincho }}>
      {/* ── 2ページ目以降で出しっぱなしの“誌面の器”＝一冊に見せるための共通レイヤー ── */}
      <AbsoluteFill style={{ opacity: 0.05 * chrome, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      <div style={{ position: "absolute", inset: 44, border: "2px solid rgba(150,110,70,0.4)", opacity: chrome }} />
      <div style={{ position: "absolute", inset: 60, border: "1px solid rgba(150,110,70,0.26)", opacity: chrome }} />

      {/* 柱（誌名）とノンブル（ページ番号）＝雑誌の本文ページの約束事 */}
      <div style={{ position: "absolute", top: 118, left: 116, right: 116, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: chrome }}>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</span>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 4 }}>{"0" + (i + 1)} / 04</span>
      </div>
      <div style={{ position: "absolute", top: 158, left: 116, right: 116, height: 1, background: "rgba(176,72,31,0.4)", opacity: chrome }} />

      {/* ── ページ本体：オーナーが選んだ4案。ページ送りは横に少し流してめくり感を出す ──
          1ページ目(案11)には寄りも横流しも掛けない。表紙からの切り替えは本編ごと
          スライドして覆う（SlideOver）ので、ここで別の動きを足すとぶつかる。 */}
      <Slides count={4} total={DUR} fade={XF} render={(k, lf, sg) => {
        const it = items[k];
        if (k === 0) {
          return <Page11 it={it} lf={lf} seg={sg} storeName={storeName} handle={handle} theme={theme} />;
        }
        const x = interpolate(lf, [0, 26], [30, 0], { ...clamp, easing: EASE });
        return (
          <AbsoluteFill style={{ transform: "translateX(" + x + "px)" }}>
            {k === 1 ? <PageB it={it} lf={lf} seg={sg} slab={T.slab} /> : null}
            {k === 2 ? <Page07 it={it} lf={lf} seg={sg} slab={T.slab} /> : null}
            {k === 3 ? <Page10 it={it} lf={lf} seg={sg} slab={T.slab} /> : null}
          </AbsoluteFill>
        );
      }} />

      {/* 奥付の帯（表紙・裏表紙と対）。案11のページでは出さない。 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: T.slab, opacity: chrome }} />
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: chrome }}>
        <span style={{ fontFamily: mincho, color: "#FDF6EA", fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>{storeName}</span>
        <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 4 }}>{handle}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// 本編が画面の右外から入ってきて表紙を覆う（＝画面スライドで切り替える）。
// 覆う側だけが動き、覆われる表紙は最後まで止まったまま＝影や滲みが一切出ない。
const SlideOver: React.FC<{ xf: number; children: React.ReactNode }> = ({ xf, children }) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, xf], [1080, 0], { ...clamp, easing: EASE });
  return <AbsoluteFill style={{ transform: "translateX(" + x + "px)" }}>{children}</AbsoluteFill>;
};

export const YoshokuMagazine: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian", openText = "",
}) => (
  <AbsoluteFill style={{ backgroundColor: PAPER }}>
    {/* 音楽は表紙〜本文〜裏表紙に通す */}
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)}
      volume={(ff) => interpolate(ff, [0, 16, YMAGZ_DUR - 30, YMAGZ_DUR], [0, 0.8, 0.8, 0], clamp)} />
    {/* 表紙(OP)を先に置き、その上を本編が右から左へスライドして覆う。
        表紙は動かさず、消えもしない（＝影も滲みも出さない）。上に乗る本編が
        画面を塞ぎきったところで表紙のSequenceが終わる。
        dur には覆いきる時刻より後を渡し、表紙が自分でフェードアウトし始めないようにする。 */}
    <Sequence durationInFrames={MAGZ_OPEN + STORY_XF}>
      <StoryOpenV v={9} storeName={storeName} theme={theme} openText={openText} dur={MAGZ_OPEN + STORY_XF + 20} />
    </Sequence>
    <Sequence from={MAGZ_OPEN} durationInFrames={MAGZ_BODY}>
      <SlideOver xf={STORY_XF}>
        <MagazineBody storeName={storeName} handle={handle} theme={theme} />
      </SlideOver>
    </Sequence>
    <Sequence from={MAGZ_OPEN + MAGZ_BODY - STORY_XF} durationInFrames={MAGZ_END + STORY_XF}>
      <StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} />
    </Sequence>
  </AbsoluteFill>
);
