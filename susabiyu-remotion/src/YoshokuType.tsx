// 洋食⑨タイポ・オープニング：暗転から一言(フック)を大きく→3〜4秒でじわり明転→4品を紹介。
// 役割＝“掴み”。導入は中央のタイトルカード（意図した中央）、明転後は左揃えのエディトリアルに移行。
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, rise, drawW, fade,
  Grain, Vignette, PhotoLayer, Slides, StoreLogoColor, phraseLines, heroSize, fitOneLine, segNow,
} from "./yoshokuDesign";

export const YTYPE_DUR = 480; // 16s

// 明転後は暗幕を一切かけないので、文字は“周りだけを締める”三段影で読ませる。
// （近い濃い影＋中間＋広く柔らかい影。画面全体を暗くせずに可読性を確保する）
const BARE_SHADOW = "0 1px 3px rgba(0,0,0,0.95), 0 3px 12px rgba(0,0,0,0.9), 0 8px 34px rgba(0,0,0,0.8)";

export const YoshokuType: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YTYPE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", disp: "", desc: "" }];
  const items = [0, 1, 2, 3, 4, 5].map((i) => p[i] || p[p.length - 1]); // 6品紹介

  // 導入タイポ（フック）：出現→明転とともに退場
  const bigO = interpolate(f, [12, 34, 118, 138], [0, 1, 1, 0], clamp);
  const bigY = interpolate(f, [12, 36], [40, 0], { ...clamp, easing: EASE });
  const bigLS = interpolate(f, [12, 44], [18, 3], { ...clamp, easing: EASE });
  const bigBlur = interpolate(f, [12, 40], [12, 0], { ...clamp, easing: EASE });
  const bigSize = heroSize(typoHeadline, 128, 82);
  // 明転：3秒(90f)まで暗く→4秒(122f)で明転しきる。タイミングはこのまま（ここは合っている）。
  // 変えたのは“明転しきったあと”。以前は黒10%・上下グラデ・ビネットが残りっぱなしで、
  // せっかく明るくなっても料理が沈んだままだった。明転の進み具合(lit)に暗い加工を全部
  // 連動させて、明けきったところで完全にゼロにする＝写真そのままの明るさになる。
  const lit = interpolate(f, [90, 122, 150], [0, 0.72, 1], clamp);   // 0=暗い / 1=明けきった
  const darkO = interpolate(f, [0, 90, 122, 150], [0.9, 0.82, 0.28, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 18, DUR - 24, DUR], [0, 0.82, 0.82, 0], clamp)} />

      {/* 背景：4品クロスフェード（ズーム抑制）＋明転オーバーレイ */}
      <AbsoluteFill>
        <Slides count={6} total={DUR} render={(i, local, seg) => (
          <PhotoLayer src={items[i].src} frame={local} dur={seg} from={1.03} to={1.09} sat={1.08} brightness={1.03} />
        )} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: darkO }} />
      {/* 上下の暗幕とビネットは“導入の暗い間だけ”。明転しきったら completely 消す。 */}
      <AbsoluteFill style={{ opacity: 1 - lit, background: "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.06) 62%, rgba(0,0,0,0.72) 100%)" }} />
      {lit < 0.999 ? <Vignette strength={0.34 * (1 - lit)} /> : null}
      <Grain />


      {/* 導入：超特大タイポ（中央・タイトルカード） */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: mincho, color: "#F7F1E4", fontSize: bigSize, fontWeight: 700, letterSpacing: bigLS, textAlign: "center", lineHeight: 1.2, opacity: bigO, transform: "translateY(" + bigY + "px)", filter: "blur(" + bigBlur + "px)", textShadow: "0 4px 32px rgba(0,0,0,0.7)", padding: "0 " + SAFE.side + "px" }}>
          {phraseLines(typoHeadline).map((ln, i) => <div key={i} style={{ whiteSpace: "nowrap" }}>{ln}</div>)}
        </div>
        <div style={{ marginTop: 26, width: drawW(f, 40, 260, 30), height: 2, background: T.accent, opacity: bigO }} />
      </AbsoluteFill>

      {/* 明転後：左上に色付きロゴを大きく（フィード投稿と同じ色ロゴ・サイズ感） */}
      <div style={{ position: "absolute", top: SAFE.top - 150, left: SAFE.side, opacity: fade(f, 118) }}>
        <StoreLogoColor storeName={storeName} height={140} />
        <div style={{ marginTop: 10, fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 6, fontWeight: 600, textTransform: "uppercase", textShadow: BARE_SHADOW }}>{T.label}</div>
      </div>

      {/* 明転後：料理名（左下・大）＝“1件だけ”表示 */}
      {(() => {
        const { i, local } = segNow(DUR, 6, f);
        if (i === 0 && f < 130) return null;
        const it = items[i]; const _nm = (it.disp && it.disp.length) ? it.disp : it.caption;
        const one = (_nm || "").replace(/[｜\n]/g, "");                 // 料理名は必ず1行
        const sz = fitOneLine(one, 96, 1080 - SAFE.side * 2, 34);
        return (
          <div key={i} style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 44, textAlign: "left", ...rise(local, 8, { dist: 20, blur: 6 }) }}>
            <div style={{ width: drawW(local, 14, 100, 24), height: 2, background: T.accent, marginBottom: 18 }} />
            <div style={{ fontFamily: mincho, color: "#FFF6E6", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, whiteSpace: "nowrap", textShadow: BARE_SHADOW }}>{one}</div>
            <div style={{ marginTop: 16, fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4, opacity: 0.9, textShadow: BARE_SHADOW }}>{handle}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
