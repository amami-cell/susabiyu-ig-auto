// 洋食⑧ポラロイド：卓上に写真を重ねる“みんなでシェア”の賑わい。カジュアルな肉バルの体温。
// 役割＝距離を縮める中盤〜締め前。堅くなりすぎた高級感を、あえて崩して親しみに変える。
// 変更点: 背景を温かい卓上トーンへ(黒すぎ解消)＋地紋／写真を大きく密度よく配置／上の2行を大きく／フッターは店舗ロゴ。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { typoPhotos, typoHeadline, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, fade,
  Grain, Vignette, StoreLogo, splitLines, heroSize,
} from "./yoshokuDesign";

export const YPOLA_DUR = 300; // 10s

export const YoshokuPola: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YPOLA_DUR;
  const T = ytheme(theme);
  const p0 = typoPhotos[0] || { src: "", caption: "" };
  const cards = [p0, typoPhotos[1] || p0, typoPhotos[2] || p0, typoPhotos[3] || p0];
  // 2x2の密なクラスタ。空きを減らし写真を大きく。回転は控えめ＝上品。
  const layout = [
    { x: -232, y: -256, rot: -4, cap: cards[0] },
    { x: 232, y: -232, rot: 3.5, cap: cards[1] },
    { x: -232, y: 258, rot: 3, cap: cards[2] },
    { x: 232, y: 282, rot: -3.5, cap: cards[3] },
  ];

  return (
    <AbsoluteFill style={{ fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 背景：温かい卓上（木/クラフト）＋地紋。真っ黒を避ける。 */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 42%, #3c2e22 0%, #2a2016 52%, #1c150e 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,240,220,0.5) 0 1px, transparent 1px 30px)" }} />
      <Grain opacity={0.09} />
      <Vignette strength={0.5} />

      {/* 上：ラベル＋フック（2行・大きく） */}
      <div style={{ position: "absolute", top: SAFE.top - 40, left: SAFE.side, right: SAFE.side, textAlign: "center", opacity: fade(f, 6) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 42, letterSpacing: 10, fontWeight: 600 }}>{T.label}</div>
        <div style={{ marginTop: 12, fontFamily: mincho, color: "#F1E7D6", fontSize: heroSize(typoHeadline, 44, 34), fontWeight: 600, letterSpacing: 3, lineHeight: 1.3 }}>
          {splitLines(typoHeadline).length ? splitLines(typoHeadline).map((ln, i) => <div key={i}>{ln}</div>) : typoHeadline}
        </div>
      </div>

      {/* ポラロイド4枚（大きめ・密） */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", transform: "translateY(70px)" }}>
        {layout.map((L, i) => {
          const start = 20 + i * 14;
          const o = fade(f, start, 16);
          const pop = interpolate(f, [start, start + 20], [0.82, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) });
          const yy = interpolate(f, [start, start + 22], [34, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          const sz = heroSize(L.cap.caption, 32, 24);
          return (
            <div key={i} style={{ position: "absolute", transform: "translate(" + L.x + "px," + (L.y + yy) + "px) rotate(" + L.rot + "deg) scale(" + pop + ")", opacity: o }}>
              <div style={{ width: 500, background: "#FBF7EE", padding: "20px 20px 0", borderRadius: 5, boxShadow: "0 28px 60px rgba(0,0,0,0.6)" }}>
                <div style={{ width: 460, height: 460, overflow: "hidden", background: "#000" }}>
                  <Img src={staticFile(L.cap.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: mincho, color: "#2a2420", fontSize: sz, fontWeight: 600, letterSpacing: 1, textAlign: "center", padding: "0 10px" }}>{L.cap.caption}</div>
                </div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, ...(function () { const o = fade(f, DUR - 60); return { opacity: o }; })() }}>
        <StoreLogo storeName={storeName} height={80} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
