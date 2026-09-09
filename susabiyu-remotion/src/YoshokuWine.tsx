// 洋食⑥ペアリング（上下2分割＝横割り）：上下に一皿ずつ。4品を2ページでゆっくりスライド紹介。
// 「寄りすぎて何の料理か分からない」を解消するため、各半分は“ぼかし背景＋contain”で皿の全体を見せる。
// 文字は半透明スクリム＋影で背景と分離。アニメは useCurrentFrame/interpolate のみ。
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart, typoLogoRound } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, fade,
  Grain, PhotoLayer, SampleBadge, fitOneLine,
} from "./yoshokuDesign";

export const YWINE_DUR = 300; // 10s
const HALF = 960; // 上下それぞれの高さ

// 半透明スクリム（文字の後ろ）。
const Scrim: React.FC<{ dir: "up" | "down"; height: number }> = ({ dir, height }) => (
  <div style={{
    position: "absolute", left: 0, right: 0, height, pointerEvents: "none",
    [dir === "up" ? "bottom" : "top"]: 0,
    background: "linear-gradient(" + (dir === "up" ? "0deg" : "180deg") + ", rgba(6,4,2,0.84) 0%, rgba(6,4,2,0.5) 46%, rgba(6,4,2,0) 100%)",
  }} />
);

// 上下どちらか半分の一皿：ぼかし背景＋contain（全体が見える）＋名前。
const Half: React.FC<{ item: any; f: number; delay: number; label: string; accent: string; nameAtBottom: boolean }> =
  ({ item, f, delay, label, accent, nameAtBottom }) => {
    const nm = (item.disp && item.disp.length) ? item.disp : item.caption;
    const one = (nm || "").replace(/[｜\n]/g, "");
    const sz = fitOneLine(one, 58, 1080 - SAFE.side * 2, 30);
    const o = fade(f, delay, 18);
    return (
      <div style={{ position: "relative", width: 1080, height: HALF, overflow: "hidden", opacity: o }}>
        <AbsoluteFill><PhotoLayer src={item.src} frame={f} dur={YWINE_DUR} from={1.16} to={1.22} sat={1.02} brightness={0.42} blur={28} /></AbsoluteFill>
        <AbsoluteFill><PhotoLayer src={item.src} frame={f} dur={YWINE_DUR} from={1.0} to={1.04} sat={1.07} brightness={1.02} fit="contain" /></AbsoluteFill>
        <Scrim dir={nameAtBottom ? "up" : "down"} height={330} />
        <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, [nameAtBottom ? "bottom" : "top"]: 40, textAlign: "center" }}>
          <div style={{ fontFamily: serif, color: accent, fontSize: 24, letterSpacing: 6, marginBottom: 8, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>{label}</div>
          {item.sub ? <div style={{ fontFamily: serif, color: "rgba(240,223,198,0.95)", fontSize: 24, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 6, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>{item.sub}</div> : null}
          <div style={{ fontFamily: mincho, color: "#FBF3E4", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.15, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}>{one}</div>
        </div>
      </div>
    );
  };

// 1ページ＝上下2品（横割り）。
const Page: React.FC<{ a: any; b: any; f: number; base: number; accent: string }> = ({ a, b, f, base, accent }) => (
  <div style={{ position: "absolute", top: 0, width: 1080, height: 1920 }}>
    <Half item={a} f={f} delay={base} label="DISH" accent={accent} nameAtBottom />
    <Half item={b} f={f} delay={base + 8} label="PAIRING" accent={accent} nameAtBottom={false} />
  </div>
);

export const YoshokuWine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YWINE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", sub: "", disp: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  // 2ページ（[0,1] → [2,3]）を横にスライド。分割は上下（横割り）のまま。
  const trackX = interpolate(f, [0, 150, 178, DUR], [0, 0, -1080, -1080], { ...clamp, easing: EASE });
  const midO = fade(f, 8);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      <div style={{ position: "absolute", top: 0, left: 0, width: 2160, height: 1920, transform: "translateX(" + trackX + "px)" }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}><Page a={items[0]} b={items[1]} f={f} base={6} accent={T.accent} /></div>
        <div style={{ position: "absolute", left: 1080, top: 0 }}><Page a={items[2]} b={items[3]} f={f} base={158} accent={T.accent} /></div>
      </div>

      {/* 中央：仕切り線＋丸ロゴ（上下の境目） */}
      <div style={{ position: "absolute", top: HALF - 2, left: 0, right: 0, height: 4, background: "rgba(224,103,58,0.6)", opacity: midO }} />
      <div style={{ position: "absolute", top: HALF - 88, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: midO }}>
        <div style={{ width: 176, height: 176, borderRadius: "50%", border: "2px solid " + T.accent, background: T.base + "E6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 44px rgba(0,0,0,0.55)" }}>
          {typoLogoRound
            ? <Img src={staticFile(typoLogoRound)} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
            : <div style={{ fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 84, lineHeight: 1 }}>&amp;</div>}
        </div>
      </div>

      <Grain opacity={0.05} />
      <SampleBadge accent={T.accent} f={f} />

      {/* 上：MEAT BAR＋本日のおすすめ */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300, pointerEvents: "none", background: "linear-gradient(180deg, rgba(6,4,2,0.8) 0%, rgba(6,4,2,0) 100%)" }} />
      <div style={{ position: "absolute", top: SAFE.top - 168, left: 0, right: 0, textAlign: "center", opacity: fade(f, 6) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 10, fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{T.label}</div>
        <div style={{ marginTop: 6, fontFamily: mincho, color: "#F4ECDB", fontSize: 42, fontWeight: 700, letterSpacing: 6, textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}>本日のおすすめ</div>
      </div>

      {/* 下：ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 190, textAlign: "center", opacity: fade(f, 40) }}>
        <span style={{ fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 5, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>{storeName} · {handle}</span>
      </div>
    </AbsoluteFill>
  );
};
