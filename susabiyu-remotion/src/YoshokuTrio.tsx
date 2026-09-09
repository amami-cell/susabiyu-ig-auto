// 洋食⑦おすすめ3品：前菜→メイン→〆を大きな番号でテンポよく。品数と満足感を一気見せ。
// 役割＝“今日はこれだけ頼めば間違いない”の提案。番号で見通しよく、最後に来店動機へ。
// 変更点: ズーム抑制(寄りすぎ解消)／右上ラベルを2行で大きく／11秒・1品を少し長く／3品維持／フッターは店舗ロゴ。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, fade,
  Grain, Vignette, PhotoLayer, Slides, SampleBadge, StoreLogo, fitOneLine, segNow,
  StoryOpening, StoryEndroll, STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";

const TRIO_BODY = 330; // 11s（1品 ≒ 3.6s）
export const YTRIO_DUR = STORY_OPEN + TRIO_BODY + STORY_END;

const TrioBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = TRIO_BODY;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "" }];
  const items = [0, 1, 2].map((i) => p[i] || p[p.length - 1]);
  const nos = ["01", "02", "03"];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: mincho }}>
      {/* 写真だけ3カットのクロスフェード（文字は重ねない＝別レイヤーで1件だけ描く）。
          料理が見切れないよう、背景はぼかしカバー＋前面は contain で皿の全体を表示（引き）。 */}
      <Slides count={3} total={DUR} fade={18} render={(i, local, seg) => (
        <>
          <AbsoluteFill><PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.14} to={1.2} sat={1.02} brightness={0.5} blur={26} /></AbsoluteFill>
          <AbsoluteFill><PhotoLayer src={items[i].src} frame={local} dur={seg} from={0.9} to={0.94} sat={1.08} brightness={1.02} fit="contain" /></AbsoluteFill>
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
        const it = items[i]; const _nm = (it.disp && it.disp.length) ? it.disp : it.caption;
        const one = (_nm || "").replace(/[｜\n]/g, "");            // 料理名は必ず1行
        const one1 = fitOneLine(one, 76, 1080 - SAFE.side * 2, 32);
        return (
          <div key={i}>
            <div style={{ position: "absolute", top: SAFE.top + 20, left: SAFE.side, ...rise(local, 4, { dist: 18 }) }}>
              <div style={{ fontFamily: serif, color: T.accent, fontSize: 168, fontWeight: 600, lineHeight: 1, textShadow: "0 3px 22px rgba(0,0,0,0.6)" }}>{nos[i]}</div>
              <div style={{ marginTop: 8, width: 96, height: 3, background: T.accent }} />
            </div>
            {/* 下：伊語サブ＋料理名（1行）＋商品説明 */}
            <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom + 96, ...rise(local, 10, { dist: 20, blur: 6 }) }}>
              {it.sub ? <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 5, textTransform: "uppercase", fontWeight: 600, marginBottom: 10, textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}>{it.sub}</div> : null}
              <div style={{ fontFamily: mincho, color: "#FFF8EC", fontSize: one1, fontWeight: 700, letterSpacing: 1, lineHeight: 1.15, whiteSpace: "nowrap", textShadow: "0 2px 20px rgba(0,0,0,0.85)" }}>{one}</div>
              {it.desc ? <div style={{ marginTop: 14, fontFamily: mincho, color: "#EFE3CC", fontSize: 29, letterSpacing: 1, lineHeight: 1.6, textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}>{it.desc}</div> : null}
            </div>
          </div>
        );
      })()}

      {/* 常時：右上ラベル（2行・大きく） */}
      <div style={{ position: "absolute", top: SAFE.top + 6, right: SAFE.side, textAlign: "right", opacity: fade(f, 8) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 40, letterSpacing: 8, fontWeight: 600 }}>{T.label}</div>
        <div style={{ fontFamily: mincho, color: "#EDE4D2", fontSize: 36, letterSpacing: 4, marginTop: 8, fontWeight: 600 }}>本日のおすすめ3品</div>
      </div>

      {/* 最下部・中央：店舗ロゴを大きく（常時表示）＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 190, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: fade(f, 16) }}>
        <StoreLogo storeName={storeName} height={132} tint="#FFF8EC" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuTrio: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {/* 音楽は全体（オープニング〜本編〜エンドロール）に通す */}
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, YTRIO_DUR - 30, YTRIO_DUR], [0, 0.82, 0.82, 0], clamp)} />
    <Sequence durationInFrames={STORY_OPEN}><StoryOpening storeName={storeName} theme={theme} /></Sequence>
    <Sequence from={STORY_OPEN} durationInFrames={TRIO_BODY}><TrioBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
    <Sequence from={STORY_OPEN + TRIO_BODY - STORY_XF} durationInFrames={STORY_END + STORY_XF}><StoryEndroll storeName={storeName} handle={handle} theme={theme} /></Sequence>
  </AbsoluteFill>
);
