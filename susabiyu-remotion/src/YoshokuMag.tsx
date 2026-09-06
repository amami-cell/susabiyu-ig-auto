// 洋食④エディトリアル：雑誌の表紙の作法。上に写真(4品クロスフェード)、下の余白に大きな見出し。
// 見出し＝料理名(disp＝承認済み改行)、その上に欧文サブ。オープニング＋本編＋エンドロールを連結。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, fade,
  Grain, StoreLogo, PhotoLayer, Slides, SampleBadge, splitLines, heroSize, segNow,
  StoryOpening, StoryEndroll, STORY_OPEN, STORY_END,
} from "./yoshokuDesign";

const MAG_BODY = 480; // 16s
export const YMAG_DUR = STORY_OPEN + MAG_BODY + STORY_END;

const MagBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = MAG_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);
  const barH = drawW(f, 26, 220, 34);
  const oneLiner = items[segNow(DUR, 4, f).i].story || typoHeadline;

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + " 0%, " + T.footBase + " 100%)" }} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

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

      {/* 下：見出し（横組み・特大・最大2行）＝表紙の主役＝料理名。上に欧文サブ。 */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 470 }}>
        <div style={{ width: 3, height: barH, background: T.accent, marginBottom: 22 }} />
        {(() => {
          const { i, local } = segNow(DUR, 4, f);
          const it = items[i];
          const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
          const lines = splitLines(nm);
          const sz = heroSize(nm, 104, 64);
          return (
            <div key={i} style={{ ...rise(local, 6, { dist: 24, blur: 6 }) }}>
              <div style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5, marginBottom: 12, textTransform: "uppercase", fontWeight: 600 }}>{it.sub || ("No.0" + (i + 1))}</div>
              <div style={{ fontFamily: mincho, color: T.ink, fontSize: sz, fontWeight: 700, letterSpacing: 2, lineHeight: 1.22, textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}>
                {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : it.caption}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 下：一言（各料理のストーリー用の短い一言。無ければ全体フック） */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: 388, opacity: fade(f, 74) }}>
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: 32, letterSpacing: 2, lineHeight: 1.6 }}>{oneLiner}</div>
      </div>

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, ...rise(f, DUR - 70, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={82} />
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
      <Sequence durationInFrames={STORY_OPEN}><StoryOpening storeName={storeName} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN} durationInFrames={MAG_BODY}><MagBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN + MAG_BODY} durationInFrames={STORY_END}><StoryEndroll storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
