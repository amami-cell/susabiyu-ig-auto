// 洋食⑥ペアリング：上下2分割で「この一皿に、この一杯」。中央のメダリオンが締めの記号。
// 役割＝“組み合わせの提案”で客単価と期待感を上げる。上下対の構図で選ぶ楽しさを見せる。
// 変更点: 中央メダリオンを大きく／下の料理名を画面下寄りへ／弱いキャッチ→「本日のおすすめ」を大きく。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, drawW, fade,
  Grain, PhotoLayer, heroSize,
} from "./yoshokuDesign";

export const YWINE_DUR = 300; // 10s

export const YoshokuWine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YWINE_DUR;
  const T = ytheme(theme);
  const a = typoPhotos[0] || { src: "", caption: "" };
  const b = typoPhotos[1] || a;

  const topY = interpolate(f, [4, 26], [-36, 0], { ...clamp, easing: EASE });
  const botY = interpolate(f, [16, 38], [36, 0], { ...clamp, easing: EASE });
  const midS = interpolate(f, [40, 66], [0.7, 1], { ...clamp, easing: EASE });
  const midO = fade(f, 40);
  const rule = drawW(f, 46, 150, 26);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 上：一皿 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 940, overflow: "hidden", opacity: fade(f, 4), transform: "translateY(" + topY + "px)" }}>
        <PhotoLayer src={a.src} frame={f} dur={DUR} from={1.04} to={1.11} sat={1.06} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 40%, " + T.base + "F2 100%)" }} />
        <div style={{ position: "absolute", left: SAFE.side, bottom: 60, opacity: fade(f, 60) }}>
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 6, marginBottom: 6 }}>DISH</div>
          <div style={{ fontFamily: mincho, color: T.ink, fontSize: heroSize(a.caption, 56, 40), fontWeight: 600, letterSpacing: 2 }}>{a.caption}</div>
        </div>
      </div>

      {/* 下：もう一皿／一杯（料理名は画面下寄りに） */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 940, overflow: "hidden", opacity: fade(f, 16), transform: "translateY(" + botY + "px)" }}>
        <PhotoLayer src={b.src} frame={f} dur={DUR} from={1.11} to={1.04} sat={1.06} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 42%, " + T.base + "F2 100%)" }} />
        <div style={{ position: "absolute", left: SAFE.side, bottom: SAFE.bottom - 96, opacity: fade(f, 70) }}>
          <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 6, marginBottom: 6 }}>PAIRING</div>
          <div style={{ fontFamily: mincho, color: T.ink, fontSize: heroSize(b.caption, 56, 40), fontWeight: 600, letterSpacing: 2 }}>{b.caption}</div>
        </div>
      </div>

      <Grain opacity={0.05} />

      {/* 中央：大きめメダリオン＋「本日のおすすめ」 */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: midO }}>
        <div style={{ width: rule, height: 1, background: T.line, marginBottom: 20 }} />
        <div style={{ width: 184, height: 184, borderRadius: "50%", border: "2px solid " + T.accent, background: T.base + "D9", display: "flex", alignItems: "center", justifyContent: "center", transform: "scale(" + midS + ")", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <div style={{ fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 96, lineHeight: 1 }}>&amp;</div>
        </div>
        <div style={{ width: rule, height: 1, background: T.line, marginTop: 20 }} />
        <div style={{ marginTop: 20, fontFamily: mincho, color: T.ink, fontSize: 46, fontWeight: 700, letterSpacing: 6, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>本日のおすすめ</div>
        {/* ブランドは安全な中央に添える（下端はIG返信バーに隠れるため置かない） */}
        <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5, opacity: fade(f, 70) }}>{storeName} · {handle}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
