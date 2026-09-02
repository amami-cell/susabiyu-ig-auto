// 洋食⑩本日OPEN／ご予約：ストーリーの締め。開店の合図→情緒コピー→予約導線(CTA)で行動につなげる。
// 役割＝“最後まで見た人”を来店・予約へ。1本の物語の着地点。
// 変更点: ズーム抑制(寄りすぎ解消)／弱いキャッチ→「〜コスパ良く日常に贅沢を〜」／フッターは店舗ロゴ(横型)。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, rise, drawW, fade,
  Grain, Vignette, PhotoLayer, StoreLogo, heroSize,
} from "./yoshokuDesign";

export const YOPEN_DUR = 300; // 10s

export const YoshokuOpen: React.FC<{ storeName?: string; handle?: string; theme?: string; openText?: string; reserveText?: string; tagline?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
  openText = "OPEN 17:00", reserveText = "ご予約はプロフィールのリンクから",
  tagline = "〜コスパ良く日常に贅沢を〜",
}) => {
  const f = useCurrentFrame();
  const DUR = YOPEN_DUR;
  const T = ytheme(theme);
  const hero = typoPhotos[0] || { src: "", caption: "" };

  const openScale = interpolate(f, [30, 54], [0.82, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) });
  const lineW = drawW(f, 50, 260, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 背景：料理写真（ズーム抑制）＋暗幕 */}
      <AbsoluteFill style={{ opacity: fade(f, 0, 16) }}>
        <PhotoLayer src={hero.src} frame={f} dur={DUR} from={1.04} to={1.10} brightness={0.7} sat={1.05} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + "CC 0%, " + T.base + "4D 34%, " + T.base + "66 60%, " + T.base + "F2 100%)" }} />
      <Vignette strength={0.5} />
      <Grain />

      {/* 金の細枠＋上ラベル */}
      <div style={{ position: "absolute", inset: 70, border: "1.5px solid " + T.accent, borderRadius: 10, opacity: fade(f, 16) * 0.8 }} />
      <div style={{ position: "absolute", top: SAFE.top - 20, left: 0, right: 0, textAlign: "center", opacity: fade(f, 18) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 14, fontWeight: 600 }}>{T.label}</div>
      </div>

      {/* 中央：OPEN ＋ 情緒コピー */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: serif, color: "#FFFFFF", fontSize: 120, fontWeight: 700, letterSpacing: 8, opacity: fade(f, 30), transform: "scale(" + openScale + ")", textShadow: "0 4px 26px rgba(0,0,0,0.7)" }}>{openText}</div>
        <div style={{ marginTop: 24, width: lineW, height: 2, background: T.accent }} />
        <div style={{ marginTop: 26, fontFamily: mincho, color: "#F4ECDB", fontSize: 46, fontWeight: 600, letterSpacing: 4, textShadow: "0 2px 16px rgba(0,0,0,0.6)", ...rise(f, 58, { dist: 16 }) }}>{tagline}</div>
      </AbsoluteFill>

      {/* 下：料理名＋予約CTA */}
      <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom + 20, textAlign: "center", opacity: fade(f, 84) }}>
        <div style={{ fontFamily: mincho, color: T.sub, fontSize: heroSize(hero.caption, 42, 32), letterSpacing: 3, marginBottom: 18 }}>本日の一皿：{hero.caption}</div>
        <div style={{ display: "inline-block", padding: "13px 32px", border: "1px solid " + T.line, borderRadius: 999 }}>
          <span style={{ fontFamily: mincho, color: T.accent, fontSize: 30, letterSpacing: 2 }}>{reserveText}</span>
        </div>
      </div>

      {/* フッター：店舗ロゴ（横型）＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: interpolate(f, [DUR - 54, DUR - 36], [0, 1], clamp) }}>
        <StoreLogo storeName={storeName} height={46} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
