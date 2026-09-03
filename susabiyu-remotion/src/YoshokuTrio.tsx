// 洋食⑦おすすめ3品：前菜→メイン→〆を大きな番号でテンポよく。品数と満足感を一気見せ。
// 役割＝“今日はこれだけ頼めば間違いない”の提案。番号で見通しよく、最後に来店動機へ。
// 変更点: ズーム抑制(寄りすぎ解消)／右上ラベルを2行で大きく／11秒・1品を少し長く／3品維持／フッターは店舗ロゴ。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, fade,
  Grain, Vignette, PhotoLayer, Slides, SampleBadge, StoreLogo, splitLines, heroSize, segNow,
} from "./yoshokuDesign";

export const YTRIO_DUR = 330; // 11s（1品 ≒ 3.6s）

export const YoshokuTrio: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YTRIO_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "" }];
  const items = [0, 1, 2].map((i) => p[i] || p[p.length - 1]);
  const nos = ["01", "02", "03"];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 写真だけ3カットのクロスフェード（文字は重ねない＝別レイヤーで1件だけ描く） */}
      <Slides count={3} total={DUR} fade={18} render={(i, local, seg) => (
        <>
          <AbsoluteFill>
            <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.03} to={1.08} sat={1.08} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.12) 58%, rgba(0,0,0,0.86) 100%)" }} />
        </>
      )} />
      <Vignette strength={0.42} />
      <Grain opacity={0.05} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

      {/* 番号＋料理名＝カットごとに“1件だけ”表示 */}
      {(() => {
        const { i, local } = segNow(DUR, 3, f);
        const it = items[i]; const lines = splitLines(it.caption);
        const sz = heroSize(it.caption, 72, 50);
        return (
          <div key={i}>
            <div style={{ position: "absolute", top: SAFE.top + 20, left: SAFE.side, ...rise(local, 4, { dist: 18 }) }}>
              <div style={{ fontFamily: serif, color: T.accent, fontSize: 168, fontWeight: 600, lineHeight: 1, textShadow: "0 3px 22px rgba(0,0,0,0.6)" }}>{nos[i]}</div>
              <div style={{ marginTop: 8, width: 96, height: 3, background: T.accent }} />
            </div>
            <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom + 20, ...rise(local, 10, { dist: 20, blur: 6 }) }}>
              <div style={{ fontFamily: mincho, color: "#FFF8EC", fontSize: sz, fontWeight: 700, letterSpacing: 3, lineHeight: 1.22, textShadow: "0 2px 20px rgba(0,0,0,0.75)" }}>
                {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : it.caption}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 常時：右上ラベル（2行・大きく） */}
      <div style={{ position: "absolute", top: SAFE.top + 6, right: SAFE.side, textAlign: "right", opacity: fade(f, 8) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 40, letterSpacing: 8, fontWeight: 600 }}>{T.label}</div>
        <div style={{ fontFamily: mincho, color: "#EDE4D2", fontSize: 36, letterSpacing: 4, marginTop: 8, fontWeight: 600 }}>本日のおすすめ3品</div>
      </div>

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: interpolate(f, [DUR - 54, DUR - 36], [0, 1], clamp) }}>
        <StoreLogo storeName={storeName} height={78} tint="#FFF8EC" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
