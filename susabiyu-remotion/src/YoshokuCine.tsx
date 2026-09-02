// 洋食⑤シネマ：レターボックス＋ゆっくりパンの“映画”。最初にタイトル(フック)、以降は各カットに字幕。
// 役割＝世界観・雰囲気を売る。静かなカメラ移動で高級感、字幕で品を一つずつ見せる。
// 変更点: 1品→4品クロスフェード／ズーム抑制(寄りすぎ解消)／タイトル→シーンの流れ設計／16秒。
//         好評だったパン＆キャプションの質感は踏襲。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, rise, drawW, fade,
  Grain, PhotoLayer, Slides, splitLines, heroSize, StoreLogo,
} from "./yoshokuDesign";

export const YCINE_DUR = 480; // 16s
const BAR = 200;

export const YoshokuCine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YCINE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  const barH = interpolate(f, [0, 24], [0, BAR], { ...clamp, easing: EASE });
  // タイトル(フック)は導入で主役→静かに退場。以降はシーンの字幕が主役。
  const titleO = interpolate(f, [30, 52, 108, 130], [0, 1, 1, 0], clamp);
  const titleY = interpolate(f, [30, 52], [22, 0], { ...clamp, easing: EASE });
  const lineW = drawW(f, 54, 240, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 18, DUR - 24, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 全画面：4品をクロスフェード＋ゆっくりパン（寄りすぎない） */}
      <AbsoluteFill>
        <Slides count={4} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.05} to={1.10} panX={28} sat={1.05} brightness={1.0} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)" }} />
      <Grain opacity={0.05} />

      {/* レターボックス */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barH, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barH, background: "#000" }} />

      {/* 導入タイトル（中央・フック） */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: titleO, transform: "translateY(" + titleY + "px)" }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 12, marginBottom: 22 }}>{T.label}</div>
        <div style={{ fontFamily: mincho, color: "#FFFFFF", fontSize: heroSize(typoHeadline, 72, 52), fontWeight: 700, letterSpacing: 5, textAlign: "center", lineHeight: 1.3, textShadow: "0 3px 26px rgba(0,0,0,0.7)", padding: "0 " + SAFE.side + "px" }}>
          {splitLines(typoHeadline).length ? splitLines(typoHeadline).map((ln, i) => <div key={i}>{ln}</div>) : typoHeadline}
        </div>
        <div style={{ marginTop: 24, width: lineW, height: 2, background: T.accent, opacity: 0.9 }} />
      </AbsoluteFill>

      {/* 各シーンの字幕（料理名・下バー上）。タイトル退場後から前面に。 */}
      <Slides count={4} total={DUR} fade={16} render={(i, local) => {
        if (i === 0 && f < 120) return null; // 1カット目はタイトル優先
        const lines = splitLines(items[i].caption);
        const sz = heroSize(items[i].caption, 60, 42);
        return (
          <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: BAR + 44, textAlign: "center", ...rise(local, 8, { dist: 16 }) }}>
            <div style={{ fontFamily: mincho, color: "#F4ECDD", fontSize: sz, fontWeight: 600, letterSpacing: 3, lineHeight: 1.24, textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}>
              {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : items[i].caption}
            </div>
          </div>
        );
      }} />

      {/* 下バー内：店舗ロゴ＋ハンドル（返信バーに隠れない高さへ） */}
      <div style={{ position: "absolute", bottom: 116, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: interpolate(f, [DUR - 60, DUR - 40], [0, 1], clamp) }}>
        <StoreLogo storeName={storeName} height={40} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 22, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
