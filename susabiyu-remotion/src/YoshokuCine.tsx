// 洋食⑤シネマ：上にブランドロゴ、中央に料理を大きく（全体が見える）、下に料理名＋伊語サブ＋説明。
// 役割＝世界観と“何の料理か”を同時に伝える。上下の余白を情報で満たし、寂しさを解消する。
// 料理名は fitOneLine で必ず1行に収める。アニメは useCurrentFrame/interpolate のみ。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, fade,
  Grain, PhotoLayer, Slides, StoreLogo, fitOneLine, segNow,
} from "./yoshokuDesign";

export const YCINE_DUR = 480; // 16s

export const YoshokuCine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YCINE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", sub: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0806", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 18, DUR - 24, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 背景：同写真の暗ぼかし（余白を寂しくしない）＋前面は contain で料理の全体を大きく見せる */}
      <Slides count={4} total={DUR} render={(i, local, seg) => (
        <>
          <AbsoluteFill><PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.16} to={1.22} sat={1.02} brightness={0.4} blur={30} /></AbsoluteFill>
          <div style={{ position: "absolute", left: 40, right: 40, top: 396, height: 900 }}>
            <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.0} to={1.04} sat={1.07} brightness={1.03} fit="contain" />
          </div>
        </>
      )} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,4,2,0.86) 0%, rgba(6,4,2,0.15) 20%, rgba(6,4,2,0.15) 66%, rgba(6,4,2,0.9) 88%, #0b0806 100%)" }} />
      <Grain opacity={0.05} />


      {/* 上：ブランドロゴを大きく＋ラテンのキッカー */}
      <div style={{ position: "absolute", top: SAFE.top - 150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, ...rise(f, 6, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={150} tint="#FFF6E6" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 10, textTransform: "uppercase", fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{T.label}</div>
      </div>

      {/* 下：伊語サブ＋料理名（必ず1行）＋説明。カットごとに1件だけ描く。 */}
      {(() => {
        const { i, local } = segNow(DUR, 4, f);
        const it = items[i];
        const nm = (it.disp && it.disp.length) ? it.disp : it.caption;
        const one = (nm || "").replace(/[｜\n]/g, ""); // 1行で見せる
        const sz = fitOneLine(one, 76, 1080 - SAFE.side * 2, 34);
        return (
          <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: 1360, textAlign: "center", ...rise(local, 8, { dist: 16 }) }}>
            {it.sub ? <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 5, textTransform: "uppercase", fontWeight: 600, marginBottom: 12, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{it.sub}</div> : null}
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.15, whiteSpace: "nowrap", textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}>{one}</div>
            {it.desc ? <div style={{ marginTop: 18, fontFamily: mincho, color: "#E9DCC4", fontSize: 30, letterSpacing: 1, lineHeight: 1.6, textShadow: "0 2px 14px rgba(0,0,0,0.85)" }}>{it.desc}</div> : null}
          </div>
        );
      })()}

      {/* 最下部：ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 176, textAlign: "center", opacity: fade(f, 30) }}>
        <span style={{ fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 5, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
