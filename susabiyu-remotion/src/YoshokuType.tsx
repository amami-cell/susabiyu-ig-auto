// 洋食⑨タイポ・オープニング：暗転から一言(フック)を大きく→3〜4秒でじわり明転→4品を紹介。
// 役割＝“掴み”。導入は中央のタイトルカード（意図した中央）、明転後は左揃えのエディトリアルに移行。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, rise, drawW, fade,
  Grain, Vignette, PhotoLayer, Slides, Masthead, splitLines, heroSize, segNow,
} from "./yoshokuDesign";

export const YTYPE_DUR = 480; // 16s

export const YoshokuType: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YTYPE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  // 導入タイポ（フック）：出現→明転とともに退場
  const bigO = interpolate(f, [12, 34, 118, 138], [0, 1, 1, 0], clamp);
  const bigY = interpolate(f, [12, 36], [40, 0], { ...clamp, easing: EASE });
  const bigLS = interpolate(f, [12, 44], [18, 3], { ...clamp, easing: EASE });
  const bigBlur = interpolate(f, [12, 40], [12, 0], { ...clamp, easing: EASE });
  const bigSize = heroSize(typoHeadline, 128, 82);
  // 明転：3秒(90f)まで暗く→4秒(120f)で料理が立ち上がる
  const darkO = interpolate(f, [0, 90, 122], [0.9, 0.84, 0.3], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 18, DUR - 24, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 背景：4品クロスフェード（ズーム抑制）＋明転オーバーレイ */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.05} to={1.11} sat={1.06} brightness={0.96} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: darkO }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0.12) 60%, rgba(0,0,0,0.8) 100%)" }} />
      <Vignette strength={0.44} />
      <Grain />

      {/* 導入：超特大タイポ（中央・タイトルカード） */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: mincho, color: "#F7F1E4", fontSize: bigSize, fontWeight: 700, letterSpacing: bigLS, textAlign: "center", lineHeight: 1.14, opacity: bigO, transform: "translateY(" + bigY + "px)", filter: "blur(" + bigBlur + "px)", textShadow: "0 4px 32px rgba(0,0,0,0.7)", padding: "0 " + SAFE.side + "px" }}>
          {splitLines(typoHeadline).length ? splitLines(typoHeadline).map((ln, i) => <div key={i}>{ln}</div>) : typoHeadline}
        </div>
        <div style={{ marginTop: 26, width: drawW(f, 40, 260, 30), height: 2, background: T.accent, opacity: bigO }} />
      </AbsoluteFill>

      {/* 明転後：左上ロゴのマストヘッド */}
      <div style={{ opacity: fade(f, 118) }}>
        <Masthead storeName={storeName} kicker={T.label} accent={T.accent} tint="#FFF6E6" f={f} />
      </div>

      {/* 明転後：料理名（左下・大）＝“1件だけ”表示 */}
      {(() => {
        const { i, local } = segNow(DUR, 4, f);
        if (i === 0 && f < 130) return null;
        const it = items[i]; const lines = splitLines(it.caption);
        const sz = heroSize(it.caption, 82, 54);
        return (
          <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(local, 8, { dist: 20, blur: 6 }) }}>
            <div style={{ width: drawW(local, 14, 100, 24), height: 2, background: T.accent, marginBottom: 18 }} />
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
              {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : it.caption}
            </div>
            <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4, opacity: 0.85 }}>{handle}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
