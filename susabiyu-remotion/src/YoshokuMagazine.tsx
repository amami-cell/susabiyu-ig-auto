// 洋食⑪雑誌ストーリー：OP/CLOSE案9（雑誌の表紙／裏表紙）と本編まで同じ“紙の誌面”で揃えた1本。
// 他テンプレが暗い画面の上に写真を敷くのに対し、これは終始クリームの紙の上に誌面を組む。
//   表紙(OP) → 本文ページ(4品) → 裏表紙(CLOSE)
//
// ★本文は「1つの型を4回」ではなく、実際の雑誌のように毎ページ組み方を変える。
//   01 グラビア扉  : 大判の裁ち落とし写真＋下端に重ねたクリームの短冊見出し
//   02 左右分割    : 右に縦長の写真、左に縦組みの料理名（和文誌面の作法）
//   03 円形トリミング: 特大ノンブルの透かし＋丸く抜いた写真をセンターに
//   04 白フチ写真  : 誌面に写真を貼った定番のキャプションページ
//   紙の地・二重罫・柱(誌名)・ノンブル・奥付帯はページをまたいで出しっぱなし＝“一冊”に見せる。
//
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, fade, Grain, Slides, fitOneLine, fitLines, splitLines, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
import { StoryOpenXF, StoryEndV } from "./YoshokuOpStyles";

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

// ── 01 グラビア扉：大判の写真を裁ち落とし、下端に重ねたクリームの短冊に見出しを置く ──
const PageA: React.FC<{ it: Item; lf: number; seg: number; slab: string }> = ({ it, lf, seg, slab }) => {
  const name = dishName(it);
  return (
    <>
      <div style={{ position: "absolute", left: 88, right: 88, top: 236, height: 1120, overflow: "hidden", boxShadow: "0 30px 70px rgba(60,35,14,0.34)" }}>
        <Plate src={it.src} lf={lf} seg={seg} />
      </div>
      {/* 写真の下端に食い込ませたクリームの短冊＝グラビアの見出しの作法 */}
      <div style={{ position: "absolute", left: 88, width: 700, top: 1176, background: "#FBF5E9", padding: "26px 34px 30px", boxShadow: "0 18px 44px rgba(60,35,14,0.30)" }}>
        <Kick text={it.sub} color={slab} usableW={700 - 68} />
        <div style={{ marginTop: 8, fontFamily: mincho, color: INK, fontSize: fitOneLine(name, 66, 700 - 68, 26), fontWeight: 700, letterSpacing: 2, lineHeight: 1.14, whiteSpace: "nowrap" }}>{name}</div>
      </div>
      <div style={{ position: "absolute", left: 88, right: 88, top: 1466 }}>
        <div style={{ width: 96, height: 3, background: slab, marginBottom: 18 }} />
        <Body text={it.desc} usableW={1080 - 176} />
      </div>
    </>
  );
};

// ── 02 左右分割：右に縦長の写真、左に縦組みの料理名（和文誌面の作法）──
const PageB: React.FC<{ it: Item; lf: number; seg: number; slab: string }> = ({ it, lf, seg, slab }) => {
  const name = dishName(it);
  const availH = 880;
  const vSize = Math.max(30, Math.min(78, Math.floor(availH / Math.max(1, Array.from(name).length))));
  return (
    <>
      {/* 写真の左端 452→320（縦組みの料理名から50pxのすき間を残す）。幅 540→672px。 */}
      <div style={{ position: "absolute", left: 320, right: 88, top: 248, height: 1140, overflow: "hidden", boxShadow: "0 28px 64px rgba(60,35,14,0.32)" }}>
        <Plate src={it.src} lf={lf} seg={seg} />
      </div>
      {/* 左の柱：縦組みの料理名。右から左へ読む向き（writing-mode: vertical-rl）。 */}
      <div style={{ position: "absolute", left: 150, top: 268, height: availH, display: "flex", alignItems: "flex-start", gap: 18 }}>
        <div style={{ writingMode: "vertical-rl", fontFamily: mincho, color: INK, fontSize: vSize, fontWeight: 700, letterSpacing: 4, lineHeight: 1 }}>{name}</div>
        <div style={{ writingMode: "vertical-rl", fontFamily: serif, color: slab, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", fontWeight: 600, marginTop: 6 }}>{it.sub || ""}</div>
      </div>
      <div style={{ position: "absolute", left: 150, top: 1180, width: 140, height: 3, background: slab }} />
      <div style={{ position: "absolute", left: 116, right: 116, top: 1450 }}>
        <Body text={it.desc} usableW={1080 - 232} />
      </div>
    </>
  );
};

// ── 03 円形トリミング：特大ノンブルの透かしの上に、丸く抜いた写真をセンターに ──
const PageC: React.FC<{ it: Item; lf: number; seg: number; slab: string; no: string }> = ({ it, lf, seg, slab, no }) => {
  const name = dishName(it);
  return (
    <>
      {/* 特大ノンブルの透かし（刷り物っぽさ） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: serif, fontStyle: "italic", fontWeight: 600, color: slab, opacity: 0.09, fontSize: 460, lineHeight: 1 }}>{no}</div>
      {/* 丸く抜いた写真＝“皿を切り取った”見立て。白フチ＋落ち影で紙から浮かせる。 */}
      <div style={{ position: "absolute", left: 175, top: 318, width: 730, height: 730, borderRadius: "50%", overflow: "hidden", border: "12px solid #FBF5E9", boxShadow: "0 34px 74px rgba(60,35,14,0.34)" }}>
        <Plate src={it.src} lf={lf} seg={seg} />
      </div>
      <div style={{ position: "absolute", left: 116, right: 116, top: 1140, textAlign: "center" }}>
        <Kick text={it.sub} color={slab} align="center" usableW={1080 - 232} />
        <div style={{ marginTop: 10, fontFamily: mincho, color: INK, fontSize: fitOneLine(name, 76, 1080 - 232, 28), fontWeight: 700, letterSpacing: 2, lineHeight: 1.14, whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ width: 96, height: 3, background: slab, margin: "22px auto 20px" }} />
        <Body text={it.desc} usableW={1080 - 232} align="center" />
      </div>
    </>
  );
};

// ── 04 白フチ写真：誌面に写真を貼った定番のキャプションページ ──
const PageD: React.FC<{ it: Item; lf: number; seg: number; slab: string }> = ({ it, lf, seg, slab }) => {
  const name = dishName(it);
  return (
    <>
      <div style={{ position: "absolute", left: 116, right: 116, top: 248, height: 800 }}>
        <div style={{ position: "absolute", inset: 0, background: "#FBF5E9", padding: 18, boxShadow: "0 26px 60px rgba(60,35,14,0.30)" }}>
          <div style={{ position: "absolute", inset: 18, overflow: "hidden" }}>
            <Plate src={it.src} lf={lf} seg={seg} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 116, right: 116, top: 1116 }}>
        <Kick text={it.sub} color={slab} />
        <div style={{ marginTop: 10, fontFamily: mincho, color: INK, fontSize: fitOneLine(name, 74, 1080 - 232, 28), fontWeight: 700, letterSpacing: 2, lineHeight: 1.16, whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ width: 96, height: 3, background: slab, margin: "22px 0 20px" }} />
        <Body text={it.desc} usableW={1080 - 232} />
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
  const { i } = segNow(DUR, 4, f);

  // 1ページ目の入り：表紙(OP)が上で薄れていく間に、誌面が“紙をめくって現れる”ように寄りから定まる。
  const inS = interpolate(f, [0, 46], [1.05, 1], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 34%, " + PAPER + " 0%, " + PAPER_D + " 100%)", fontFamily: mincho }}>
      {/* ── ページをまたいで出しっぱなしの“誌面の器”＝一冊に見せるための共通レイヤー ── */}
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      <div style={{ position: "absolute", inset: 44, border: "2px solid rgba(150,110,70,0.4)" }} />
      <div style={{ position: "absolute", inset: 60, border: "1px solid rgba(150,110,70,0.26)" }} />

      {/* 柱（誌名）とノンブル（ページ番号）＝雑誌の本文ページの約束事 */}
      <div style={{ position: "absolute", top: 118, left: 116, right: 116, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 6, 20) }}>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</span>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 4 }}>{"0" + (i + 1)} / 04</span>
      </div>
      <div style={{ position: "absolute", top: 158, left: 116, right: 116, height: 1, background: "rgba(176,72,31,0.4)", opacity: fade(f, 8, 20) }} />

      {/* ── ページ本体：4ページそれぞれ別の組み方。ページ送りは横に少し流してめくり感を出す ── */}
      <AbsoluteFill style={{ transform: "scale(" + inS + ")" }}>
        <Slides count={4} total={DUR} fade={22} render={(k, lf, seg) => {
          const x = interpolate(lf, [0, 26], [30, 0], { ...clamp, easing: EASE });
          const it = items[k];
          const no = "0" + (k + 1);
          return (
            <AbsoluteFill style={{ transform: "translateX(" + x + "px)" }}>
              {k === 0 ? <PageA it={it} lf={lf} seg={seg} slab={T.slab} /> : null}
              {k === 1 ? <PageB it={it} lf={lf} seg={seg} slab={T.slab} /> : null}
              {k === 2 ? <PageC it={it} lf={lf} seg={seg} slab={T.slab} no={no} /> : null}
              {k === 3 ? <PageD it={it} lf={lf} seg={seg} slab={T.slab} /> : null}
            </AbsoluteFill>
          );
        }} />
      </AbsoluteFill>

      {/* 奥付の帯（表紙・裏表紙と対） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: T.slab, opacity: fade(f, 10, 22) }} />
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 14, 22) }}>
        <span style={{ fontFamily: mincho, color: "#FDF6EA", fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>{storeName}</span>
        <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 4 }}>{handle}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

export const YoshokuMagazine: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian", openText = "",
}) => (
  <AbsoluteFill style={{ backgroundColor: PAPER }}>
    {/* 音楽は表紙〜本文〜裏表紙に通す */}
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)}
      volume={(ff) => interpolate(ff, [0, 16, YMAGZ_DUR - 30, YMAGZ_DUR], [0, 0.8, 0.8, 0], clamp)} />
    {/* 本編を先に置き、その上に表紙(OP)を STORY_XF ぶん長く重ねてディゾルブ＝“表紙をめくる”繋がり */}
    <Sequence from={MAGZ_OPEN} durationInFrames={MAGZ_BODY}>
      <MagazineBody storeName={storeName} handle={handle} theme={theme} />
    </Sequence>
    <Sequence durationInFrames={MAGZ_OPEN + STORY_XF}>
      <StoryOpenXF v={9} storeName={storeName} theme={theme} openText={openText} dur={MAGZ_OPEN} xf={STORY_XF} />
    </Sequence>
    <Sequence from={MAGZ_OPEN + MAGZ_BODY - STORY_XF} durationInFrames={MAGZ_END + STORY_XF}>
      <StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} />
    </Sequence>
  </AbsoluteFill>
);
