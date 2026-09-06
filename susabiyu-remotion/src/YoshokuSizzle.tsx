// 洋食③焼きたて：主菜を主役に4品をゆっくりクロスフェード。熱の“気配”をごく薄く重ねる。
// 左上ロゴ／左下に料理名(disp＝承認済み改行)＋欧文サブ＋短句。オープニング＋本編＋エンドロールを連結。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, random } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW,
  Grain, Vignette, Masthead, PhotoLayer, Slides, SampleBadge, splitLines, heroSize, segNow,
  StoryOpening, StoryEndroll, STORY_OPEN, STORY_END,
} from "./yoshokuDesign";

const SIZZLE_BODY = 480; // 16s
export const YSIZZLE_DUR = STORY_OPEN + SIZZLE_BODY + STORY_END;

const SizzleBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = SIZZLE_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  // 控えめな火の粉（決定的乱数）
  const parts = new Array(9).fill(0).map((_, i) => {
    const seed = "sz" + i;
    const x = random(seed + "x") * 1080;
    const speed = 0.4 + random(seed + "s") * 0.7;
    const yy = 1560 - ((f * speed * 7 + random(seed + "o") * 1600) % 1700);
    const size = 3 + random(seed + "z") * 5;
    const op = 0.05 + random(seed + "p") * 0.12;
    return { x, yy, size, op };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0806", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* 主役：4品フルブリード（ズーム抑制で全体が見える） */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.03} to={1.09} sat={1.1} brightness={1.0} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 24%, rgba(0,0,0,0.12) 54%, rgba(0,0,0,0.9) 100%)" }} />
      {parts.map((pt, i) => (
        <div key={i} style={{ position: "absolute", left: pt.x, top: pt.yy, width: pt.size, height: pt.size, borderRadius: "50%", background: "#FFE7B0", opacity: pt.op, filter: "blur(1px)" }} />
      ))}
      <Vignette strength={0.46} />
      <Grain />

      {/* 左上：ロゴのマストヘッド */}
      <Masthead storeName={storeName} kicker={T.label} accent={T.accent} tint="#FFF6E6" f={f} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

      {/* 左下：欧文サブ＋料理名＝カットごとに“1件だけ”表示（左揃え・重ねない） */}
      {(() => {
        const { i, local } = segNow(DUR, 4, f);
        const it = items[i];
        const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
        const lines = splitLines(nm);
        const sz = heroSize(nm, 104, 66);
        return (
          <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(local, 6, { dist: 22, blur: 6 }) }}>
            <div style={{ width: drawW(local, 12, 100, 24), height: 2, background: T.accent, marginBottom: 18 }} />
            {it.sub ? <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{it.sub}</div> : null}
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, textShadow: "0 3px 24px rgba(0,0,0,0.75)" }}>
              {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : it.caption}
            </div>
            {it.story ? (
              <div style={{ marginTop: 12, fontFamily: mincho, color: "#F3E7CF", fontSize: 35, letterSpacing: 2, opacity: 0.96, textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}>{it.story}</div>
            ) : null}
            <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

export const YoshokuSizzle: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0806" }}>
      <Sequence durationInFrames={STORY_OPEN}><StoryOpening storeName={storeName} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN} durationInFrames={SIZZLE_BODY}><SizzleBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN + SIZZLE_BODY} durationInFrames={STORY_END}><StoryEndroll storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
