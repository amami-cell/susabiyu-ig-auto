// 洋食④エディトリアル：雑誌の表紙の作法。上に写真(4品クロスフェード)、下の余白に大きな見出し。
// 見出し＝料理名(disp＝承認済み改行)、その上に欧文サブ。オープニング＋本編＋エンドロールを連結。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, SAFE, rise, fade,
  fitLines, splitLines,
  Grain, StoreLogo, PhotoLayer, Slides, fitOneLine, segNow,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";
// OP/CLOSEはテンプレごとに固定の案を使う（雑誌エディトリアル：誌面で開いて誌面で閉じる）。
import { StoryOpenV, StoryEndV } from "./YoshokuOpStyles";

const MAG_BODY = 480; // 16s
export const YMAG_DUR = STORY_OPEN + MAG_BODY + STORY_END;

const MagBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = MAG_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  // 縦罫の“引かれ具合”（0→1）。長さは固定値ではなく文字ブロックの高さに追従させる。
  const barGrow = interpolate(f, [26, 60], [0, 1], { ...clamp, easing: EASE });
  // 短句(story)は廃止。各料理の説明文(desc)を使い、無ければ全体フックにフォールバック。
  const oneLiner = items[segNow(DUR, 4, f).i].desc || typoHeadline;

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + " 0%, " + T.footBase + " 100%)" }} />


      {/* 上：写真（4品クロスフェード・表紙のメイン） */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1230, overflow: "hidden" }}>
        <Slides count={4} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.03} to={1.09} sat={1.07} />
        )} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, " + T.base + " 100%)" }} />
      </div>
      <Grain opacity={0.05} />

      {/* 上：マストヘッド（ブランド＋号数） */}
      <div style={{ position: "absolute", top: SAFE.top - 90, left: SAFE.side, right: SAFE.side, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 12) }}>
        <div style={{ fontFamily: serif, color: "#FFFFFF", fontSize: 32, letterSpacing: 10, fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{T.label}</div>
        <div style={{ fontFamily: serif, color: "#FFFFFF", fontSize: 26, letterSpacing: 6, opacity: 0.9 }}>SIGNATURE</div>
      </div>

      {/* 下：欧文サブ＋料理名＋一言を「1つのブロック」にまとめ、左の縦罫をその高さに沿わせる。
          以前は 220px の縦棒が文字の“上”に単独で立っていて、線と文字が離れた
          （＝はぐれた線に見える）。雑誌の縦罫は本文の左に添えるのが本来の作法。 */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 188, display: "flex", alignItems: "stretch" }}>
        {/* 縦罫は上から下へ引かれる（scaleY＝“罫を引く”動き。長さは文字ブロックが決める） */}
        <div style={{ width: 4, background: T.accent, opacity: 0.92, transform: "scaleY(" + barGrow + ")", transformOrigin: "top" }} />
        <div style={{ marginLeft: 30, flex: 1, minWidth: 0 }}>
          {(() => {
            const { i, local } = segNow(DUR, 4, f);
            const it = items[i];
            const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
            const one = (nm || "").replace(/[｜\n]/g, "");                  // 料理名は必ず1行
            const sz = fitOneLine(one, 104, 1080 - SAFE.side * 2 - 34, 36);
            return (
              <div key={i} style={{ ...rise(local, 6, { dist: 24, blur: 6 }) }}>
                <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 5, marginBottom: 12, textTransform: "uppercase", fontWeight: 600 }}>{it.sub || ("No.0" + (i + 1))}</div>
                <div style={{ fontFamily: mincho, color: T.ink, fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.18, whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}>{one}</div>
              </div>
            );
          })()}
          {/* 一言（各料理の説明文。無ければ全体フック）＝同じ罫の内側に置く */}
          {/* 出現は料理名のすぐ後（以前は74フレーム＝本編2.5秒目で、遅すぎて
              サムネイルにも入らず、視聴時も“後から思い出したように”出ていた）。 */}
          <div style={{ marginTop: 30, opacity: fade(f, 40) }}>
            <div style={{
              fontFamily: mincho, color: "#EADFC9", letterSpacing: 1, lineHeight: 1.36,
              textShadow: "0 2px 14px rgba(0,0,0,0.6)",
              fontSize: fitLines(oneLiner, 46, 1080 - SAFE.side * 2 - 54, 24),
            }}>
              {splitLines(oneLiner).map((l, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* フッター：店舗ロゴ＋ハンドルを右下へ（左の余白は見出し/一言が使う）。
          以前は最後の料理でだけ出ていたが、1品目から最後まで出しっぱなしにする（ブランドを常時表示）。 */}
      <div style={{ position: "absolute", right: SAFE.side, bottom: 70, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, ...rise(f, 16, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={78} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuMag: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      {/* 音楽は全体（オープニング〜本編〜エンドロール）に通す */}
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YMAG_DUR - 30, YMAG_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Sequence durationInFrames={STORY_OPEN}><StoryOpenV v={9} storeName={storeName} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN} durationInFrames={MAG_BODY}><MagBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN + MAG_BODY - STORY_XF} durationInFrames={STORY_END + STORY_XF}><StoryEndV v={9} storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
