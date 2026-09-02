// 洋食③焼きたて：肉/主菜を主役に、4品をゆっくりクロスフェード。立ちのぼる火の粉をごく薄く。
// 役割＝食欲のピークを作る中盤。湯気/熱の“気配”だけ足し、寄りすぎない画で全体を見せる。
// 変更点: 1品→4品クロスフェード／ズーム抑制(寄りすぎ解消)／説明文排除・料理名を主役(最大2行)／
//         火の粉は控えめ／フッターは店舗ロゴ／16秒。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, random } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW,
  Grain, Vignette, StoreLogo, PhotoLayer, Slides, Kicker, splitLines, heroSize, segNow,
} from "./yoshokuDesign";

export const YSIZZLE_DUR = 480; // 16s

export const YoshokuSizzle: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YSIZZLE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  // 控えめな火の粉（決定的乱数）
  const parts = new Array(11).fill(0).map((_, i) => {
    const seed = "sz" + i;
    const x = random(seed + "x") * 1080;
    const speed = 0.4 + random(seed + "s") * 0.7;
    const yy = 1560 - ((f * speed * 7 + random(seed + "o") * 1600) % 1700);
    const size = 3 + random(seed + "z") * 6;
    const op = 0.06 + random(seed + "p") * 0.14;
    return { x, yy, size, op };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0806", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* 主役：4品フルブリード（ズーム抑制で全体が見える） */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.03} to={1.09} sat={1.12} brightness={1.02} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 26%, rgba(0,0,0,0.14) 56%, rgba(0,0,0,0.9) 100%)" }} />
      {parts.map((pt, i) => (
        <div key={i} style={{ position: "absolute", left: pt.x, top: pt.yy, width: pt.size, height: pt.size, borderRadius: "50%", background: "#FFE7B0", opacity: pt.op, filter: "blur(1px)" }} />
      ))}
      <Vignette strength={0.5} />
      <Grain />

      {/* 上：キッカー */}
      <div style={{ position: "absolute", top: SAFE.top - 10, left: 0, right: 0 }}>
        <Kicker text="SIZZLE · 焼きたて" color={T.accent} f={f} start={14} />
      </div>

      {/* 主役：料理名（下・大・最大2行）＝カットごとに“1件だけ”表示（文字は重ねない） */}
      {(() => {
        const { i, local } = segNow(DUR, 4, f);
        const it = items[i]; const lines = splitLines(it.caption);
        const sz = heroSize(it.caption, 88, 56);
        return (
          <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom + 30, textAlign: "center", ...rise(local, 6, { dist: 22, blur: 6 }) }}>
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 3, lineHeight: 1.22, textShadow: "0 3px 24px rgba(0,0,0,0.75)" }}>
              {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : it.caption}
            </div>
            <div style={{ margin: "22px auto 0", width: drawW(local, 14, 200, 26), height: 3, background: T.accent }} />
          </div>
        );
      })()}

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 140, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: interpolate(f, [DUR - 60, DUR - 40], [0, 1], clamp) }}>
        <StoreLogo storeName={storeName} height={78} tint="#FFF6E6" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
