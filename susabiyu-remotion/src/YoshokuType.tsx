// 洋食⑨タイポ・オープニング：暗転から一言(フック)を大きく→3〜4秒でじわりと料理が浮かび上がる。
// 役割＝“掴み”。最初に世界観のコピーで惹き、明転で料理を見せ、以降4品をテンポよく紹介する。
// 変更点: 3秒でブラー/暗転から明転→料理を4品クロスフェード／料理名とTRATTORIAを大きく／ズーム抑制／
//         フッターは店舗ロゴ／16秒。好評だった導入の動き・コピーは踏襲。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, rise, drawW, fade,
  Grain, Vignette, PhotoLayer, Slides, StoreLogo, splitLines, heroSize,
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
  const bigLS = interpolate(f, [12, 44], [22, 6], { ...clamp, easing: EASE });
  const bigBlur = interpolate(f, [12, 40], [12, 0], { ...clamp, easing: EASE });
  const bigSize = heroSize(typoHeadline, 132, 84);
  // 明転：3秒(90f)まで暗く→4秒(120f)で料理が立ち上がる
  const darkO = interpolate(f, [0, 90, 122], [0.92, 0.86, 0.32], clamp);

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
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.14) 60%, rgba(0,0,0,0.78) 100%)" }} />
      <Vignette strength={0.5} />
      <Grain />

      {/* 上：TRATTORIA（明転後・大きく） */}
      <div style={{ position: "absolute", top: SAFE.top - 4, left: 0, right: 0, textAlign: "center", opacity: fade(f, 118) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 44, letterSpacing: 14, fontWeight: 600 }}>{T.label}</div>
      </div>

      {/* 導入：超特大タイポ（中央・フック） */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: mincho, color: "#F7F1E4", fontSize: bigSize, fontWeight: 700, letterSpacing: bigLS, textAlign: "center", lineHeight: 1.16, opacity: bigO, transform: "translateY(" + bigY + "px)", filter: "blur(" + bigBlur + "px)", textShadow: "0 4px 32px rgba(0,0,0,0.7)", padding: "0 " + SAFE.side + "px" }}>
          {splitLines(typoHeadline).length ? splitLines(typoHeadline).map((ln, i) => <div key={i}>{ln}</div>) : typoHeadline}
        </div>
        <div style={{ marginTop: 28, width: drawW(f, 40, 300, 30), height: 3, background: T.accent, opacity: bigO }} />
      </AbsoluteFill>

      {/* 明転後：料理名（下・大・カットごと） */}
      <Slides count={4} total={DUR} fade={16} render={(i, local) => {
        if (i === 0 && f < 130) return null;
        const lines = splitLines(items[i].caption);
        const sz = heroSize(items[i].caption, 80, 52);
        return (
          <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom + 20, textAlign: "center", ...rise(local, 8, { dist: 20, blur: 6 }) }}>
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 3, lineHeight: 1.22, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
              {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : items[i].caption}
            </div>
          </div>
        );
      }} />

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: interpolate(f, [DUR - 60, DUR - 40], [0, 1], clamp) }}>
        <StoreLogo storeName={storeName} height={46} tint="#FFF6E6" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
