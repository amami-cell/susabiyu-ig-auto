// 洋食②黒板トラットリア：ビストロの“本日の黒板”。日付を添え、料理名を主役に大きく。
// 役割＝「今日はこれ」を粋に伝える日替わり。黒板に粒状感と細い金枠で高級感を出す。
// 変更点: Oggiに当日の日付／説明文は排除／料理名を主役(最大2行)／写真枠を上品化／黒板に地紋／
//         フッターは店舗ロゴ／13秒。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, fade,
  Grain, StoreLogo, PhotoLayer, splitLines, heroSize,
} from "./yoshokuDesign";

export const YCHALK_DUR = 390; // 13s

function todayMD(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
  return now.getUTCMonth() + 1 + "/" + now.getUTCDate();
}

export const YoshokuChalk: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YCHALK_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const lines = splitLines(hero.caption);
  const nameSize = heroSize(hero.caption, 92, 58);
  const ruleW = drawW(f, 24, 300, 34);
  const photoO = fade(f, 60, 22);

  return (
    <AbsoluteFill style={{ backgroundColor: "#12181a", fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 黒板：濃緑〜黒のグラデ＋細かな地紋（のっぺり防止） */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 26%, #223029 0%, #141c1d 55%, #0a0f10 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 22px)" }} />
      <AbsoluteFill style={{ opacity: 0.04, backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1.4px)", backgroundSize: "26px 26px" }} />
      <Grain opacity={0.08} />

      {/* 木枠風の外枠（生成り＋金の二重ライン） */}
      <div style={{ position: "absolute", inset: 50, border: "2px solid " + T.line, borderRadius: 10, opacity: fade(f, 4) * 0.85 }} />
      <div style={{ position: "absolute", inset: 66, border: "1px solid " + T.accent, borderRadius: 8, opacity: fade(f, 8) * 0.45 }} />

      {/* 上：Oggi ＋ 当日日付 */}
      <div style={{ position: "absolute", top: SAFE.top - 20, left: 0, right: 0, textAlign: "center", opacity: fade(f, 16) }}>
        <div style={{ fontFamily: serif, fontStyle: "italic", color: "#EFEDE4", fontSize: 46, letterSpacing: 6 }}>Oggi · {todayMD()}</div>
        <div style={{ margin: "18px auto 0", width: ruleW, height: 2, background: "#EFEDE4", opacity: 0.8 }} />
      </div>

      {/* 主役：料理名（白チョーク風・大・最大2行） */}
      <div style={{ position: "absolute", top: 470, left: SAFE.side, right: SAFE.side, textAlign: "center", ...rise(f, 42, { dist: 22, blur: 6 }) }}>
        <div style={{ fontFamily: mincho, color: "#F4F2EA", fontSize: nameSize, fontWeight: 700, letterSpacing: 4, lineHeight: 1.24, textShadow: "0 1px 0 rgba(255,255,255,0.22), 0 4px 18px rgba(0,0,0,0.5)" }}>
          {lines.length ? lines.map((ln, i) => <div key={i}>{ln}</div>) : hero.caption}
        </div>
      </div>

      {/* 写真：クリームのマット＋金ヘアラインで額装（バル×エディトリアル） */}
      <div style={{ position: "absolute", top: 812, left: 165, width: 750, height: 700, opacity: photoO }}>
        <div style={{ position: "absolute", inset: 0, background: "#F3EEE2", borderRadius: 6, padding: 16, boxShadow: "0 30px 66px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", inset: 16, border: "1px solid rgba(150,120,60,0.55)", borderRadius: 3, overflow: "hidden" }}>
            <PhotoLayer src={hero.src} frame={f - 60} dur={DUR - 60} from={1.04} to={1.11} sat={1.08} />
          </div>
        </div>
      </div>

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 132, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...rise(f, DUR - 70, { dist: 14 }) }}>
        <StoreLogo storeName={storeName} height={52} tint="#F4F2EA" />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
