// 洋食⑥ペアリング（上下2分割＝横割り）：上下に一皿ずつ。6品を3ページでゆっくりスライド紹介。
// 「寄りすぎて何の料理か分からない」を解消するため、各半分は“ぼかし背景＋contain”で皿の全体を見せる。
// 文字は半透明スクリム＋影で背景と分離。アニメは useCurrentFrame/interpolate のみ。
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart, typoLogoRound } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, fade,
  Grain, PhotoLayer, fitOneLine,
} from "./yoshokuDesign";

// 6品を上下2品ずつ3ページで紹介する尺。中央の丸ロゴはこの間にレコードのように
// “ちょうど1回転”しきる（1ページ＝6秒 × 3ページ）。
export const YWINE_DUR = 540; // 18s
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
// 名前は“中央の丸ロゴから離す”：上の皿は上寄せ（ヘッダーの下）、下の皿は下寄せ。中央の継ぎ目は空ける。
const Half: React.FC<{ item: any; f: number; delay: number; label: string; accent: string; namePos: "top" | "bottom"; inset: number }> =
  ({ item, f, delay, label, accent, namePos, inset }) => {
    const nm = (item.disp && item.disp.length) ? item.disp : item.caption;
    const one = (nm || "").replace(/[｜\n]/g, "");
    const sz = fitOneLine(one, 58, 1080 - SAFE.side * 2, 30);
    const o = fade(f, delay, 18);
    return (
      <div style={{ position: "relative", width: 1080, height: HALF, overflow: "hidden", opacity: o }}>
        {/* 背景（ぼかし）は半分いっぱいに敷く */}
        <AbsoluteFill><PhotoLayer src={item.src} frame={f} dur={YWINE_DUR} from={1.16} to={1.22} sat={1.02} brightness={0.42} blur={28} /></AbsoluteFill>
        {/* 料理本体は大きさをそのままに、中央の継ぎ目側へ“空白の半分”だけ寄せる。
            contain の余白は上下に均等にできるので、objectPosition を 50%→75%(上の皿は下へ) /
            50%→25%(下の皿は上へ) にすると、ちょうど余白の半分ぶん中央へ寄る。 */}
        <AbsoluteFill>
          <PhotoLayer src={item.src} frame={f} dur={YWINE_DUR} from={1.0} to={1.04} sat={1.07} brightness={1.02}
            fit="contain" position={namePos === "top" ? "center 75%" : "center 25%"} />
        </AbsoluteFill>
        <Scrim dir={namePos === "bottom" ? "up" : "down"} height={360} />
        <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, [namePos]: inset, textAlign: "center" }}>
          <div style={{ fontFamily: serif, color: accent, fontSize: 24, letterSpacing: 6, marginBottom: 8, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>{label}</div>
          {item.sub ? <div style={{ fontFamily: serif, color: "rgba(240,223,198,0.95)", fontSize: 24, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 6, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>{item.sub}</div> : null}
          <div style={{ fontFamily: mincho, color: "#FBF3E4", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.15, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}>{one}</div>
        </div>
      </div>
    );
  };

// 1ページ＝上下2品（横割り）。上の皿の名前はヘッダー下、下の皿の名前は最下部側に置く。
const Page: React.FC<{ a: any; b: any; f: number; base: number; accent: string }> = ({ a, b, f, base, accent }) => (
  <div style={{ position: "absolute", top: 0, width: 1080, height: 1920 }}>
    <Half item={a} f={f} delay={base} label="DISH" accent={accent} namePos="top" inset={196} />
    <Half item={b} f={f} delay={base + 8} label="PAIRING" accent={accent} namePos="bottom" inset={214} />
  </div>
);

export const YoshokuWine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YWINE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", sub: "", disp: "" }];
  const items = [0, 1, 2, 3, 4, 5].map((i) => p[i] || p[p.length - 1]);

  // 3ページ（[0,1] → [2,3] → [4,5]）を横にスライド。分割は上下（横割り）のまま。
  // 1ページあたり約6秒。スライドは28フレームでゆっくり送る。
  const trackX = interpolate(f, [0, 152, 180, 332, 360, DUR], [0, 0, -1080, -1080, -2160, -2160], { ...clamp, easing: EASE });
  const midO = fade(f, 8);
  // レコードのように等速で時計回り。動画の最後でちょうど360°＝1回転しきる。
  const spin = interpolate(f, [0, DUR], [0, 360], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      <div style={{ position: "absolute", top: 0, left: 0, width: 3240, height: 1920, transform: "translateX(" + trackX + "px)" }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}><Page a={items[0]} b={items[1]} f={f} base={6} accent={T.accent} /></div>
        <div style={{ position: "absolute", left: 1080, top: 0 }}><Page a={items[2]} b={items[3]} f={f} base={160} accent={T.accent} /></div>
        <div style={{ position: "absolute", left: 2160, top: 0 }}><Page a={items[4]} b={items[5]} f={f} base={340} accent={T.accent} /></div>
      </div>

      {/* 中央：仕切り線＋丸ロゴ（上下の境目） */}
      <div style={{ position: "absolute", top: HALF - 2, left: 0, right: 0, height: 4, background: "rgba(224,103,58,0.6)", opacity: midO }} />
      <div style={{ position: "absolute", top: HALF - 135, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: midO }}>
        <div style={{ width: 270, height: 270, borderRadius: "50%", border: "3px solid " + T.accent, background: T.base + "E6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 22px 56px rgba(0,0,0,0.6)" }}>
          {/* レコード盤のように等速で時計回り。1回転しきったところが動画の終わり。 */}
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(" + spin + "deg)" }}>
            {typoLogoRound
              ? <Img src={staticFile(typoLogoRound)} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} />
              : <div style={{ fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 128, lineHeight: 1 }}>&amp;</div>}
          </div>
        </div>
      </div>

      <Grain opacity={0.05} />

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
