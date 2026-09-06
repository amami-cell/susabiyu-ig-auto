// 洋食②黒板トラットリア：ビストロの“本日の黒板”。日付を添え、料理名を主役に大きく。
// 4品を黒板に順に出し、料理名(disp＝承認済み改行)＋欧文サブ＋短句をカット毎に切替。写真は額装カードでクロスフェード。
// オープニング＋本編＋エンドロールを Sequence で連結。
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, fade, segNow,
  Grain, StoreLogo, PhotoLayer, Slides, SampleBadge, splitLines, heroSize,
  StoryOpening, StoryEndroll, STORY_OPEN, STORY_END,
} from "./yoshokuDesign";

const CHALK_BODY = 420; // 14s（4品×約3.5s）
export const YCHALK_DUR = STORY_OPEN + CHALK_BODY + STORY_END;

function todayMD(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
  return now.getUTCMonth() + 1 + "/" + now.getUTCDate();
}

const ChalkBody: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = CHALK_BODY;
  const T = ytheme(theme);
  const photos = (typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "" }]).slice(0, 4);
  const { i, local } = segNow(DUR, photos.length, f);
  const cur = photos[i] || { src: "", caption: "", story: "", sub: "", disp: "" };
  const nm = (cur.disp && cur.disp.length) ? cur.disp : cur.caption;
  const lines = splitLines(nm);
  const nameSize = heroSize(nm, 104, 66);
  const ruleW = drawW(f, 24, 300, 34);

  return (
    <AbsoluteFill style={{ backgroundColor: "#12181a", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 黒板：濃緑〜黒のグラデ＋細かな地紋（のっぺり防止） */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 26%, #223029 0%, #141c1d 55%, #0a0f10 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 22px)" }} />
      <AbsoluteFill style={{ opacity: 0.04, backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1.4px)", backgroundSize: "26px 26px" }} />
      <Grain opacity={0.08} />

      {/* 外枠は金のヘアライン一本のみ */}
      <div style={{ position: "absolute", inset: 54, border: "1px solid " + T.accent + "66", borderRadius: 8, opacity: fade(f, 4) * 0.8 }} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

      {/* 上：Oggi ＋ 当日日付 */}
      <div style={{ position: "absolute", top: SAFE.top - 20, left: 0, right: 0, textAlign: "center", opacity: fade(f, 16) }}>
        <div style={{ fontFamily: serif, fontStyle: "italic", color: "#EFEDE4", fontSize: 46, letterSpacing: 6 }}>Oggi · {todayMD()}</div>
        <div style={{ margin: "18px auto 0", width: ruleW, height: 2, background: "#EFEDE4", opacity: 0.8 }} />
      </div>

      {/* 主役：欧文サブ＋料理名（白チョーク風・特大・最大2行）＋短句。カット毎に差し替え。 */}
      <div key={i} style={{ position: "absolute", top: 440, left: SAFE.side, right: SAFE.side, textAlign: "center", ...rise(local, 3, { dist: 20, blur: 6 }) }}>
        {cur.sub ? <div style={{ fontFamily: serif, color: T.accent, fontSize: 28, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, fontStyle: "italic" }}>{cur.sub}</div> : null}
        <div style={{ fontFamily: mincho, color: "#F4F2EA", fontSize: nameSize, fontWeight: 700, letterSpacing: 2, lineHeight: 1.18, textShadow: "0 1px 0 rgba(255,255,255,0.22), 0 4px 18px rgba(0,0,0,0.5)" }}>
          {lines.length ? lines.map((ln, k) => <div key={k}>{ln}</div>) : cur.caption}
        </div>
        {cur.story ? (
          <div style={{ marginTop: 14, fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 36, letterSpacing: 3, opacity: 0.95 }}>{cur.story}</div>
        ) : null}
      </div>

      {/* 写真：クリームのマット＋金ヘアラインで額装。4品をクロスフェード。 */}
      <div style={{ position: "absolute", top: 812, left: 165, width: 750, height: 700, opacity: fade(f, 60, 22) }}>
        <div style={{ position: "absolute", inset: 0, background: "#F3EEE2", borderRadius: 6, padding: 16, boxShadow: "0 30px 66px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", inset: 16, border: "1px solid rgba(150,120,60,0.55)", borderRadius: 3, overflow: "hidden" }}>
            <Slides count={photos.length} total={DUR} render={(k, lf, seg) => (
              <PhotoLayer src={photos[k].src} frame={lf} dur={seg} from={1.04} to={1.11} sat={1.08} />
            )} />
          </div>
        </div>
      </div>

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 132, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...rise(f, DUR - 70, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={86} tint="#F4F2EA" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const YoshokuChalk: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const T = ytheme(theme);
  return (
    <AbsoluteFill style={{ backgroundColor: "#12181a" }}>
      <Sequence durationInFrames={STORY_OPEN}><StoryOpening storeName={storeName} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN} durationInFrames={CHALK_BODY}><ChalkBody storeName={storeName} handle={handle} theme={theme} /></Sequence>
      <Sequence from={STORY_OPEN + CHALK_BODY} durationInFrames={STORY_END}><StoryEndroll storeName={storeName} handle={handle} theme={theme} /></Sequence>
    </AbsoluteFill>
  );
};
