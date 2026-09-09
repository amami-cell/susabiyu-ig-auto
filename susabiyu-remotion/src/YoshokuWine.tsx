// 洋食⑥ペアリング（左右2分割スライド）：料理を左右に並べ、4品を2ページでゆっくりスライド紹介。
// 役割＝“組み合わせ／品数”を左右対で見せて選ぶ楽しさと満足感を伝える。
// 文字は半透明スクリム＋影で背景と分離（見にくさ解消）。アニメは useCurrentFrame/interpolate のみ。
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart, typoLogoRound } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, fade,
  Grain, PhotoLayer, SampleBadge, heroSize, splitLines,
} from "./yoshokuDesign";

export const YWINE_DUR = 300; // 10s

// 半透明スクリム（下/上）＝文字の後ろに敷いて背景と分離。
const Scrim: React.FC<{ dir: "up" | "down"; height: number }> = ({ dir, height }) => (
  <div style={{
    position: "absolute", left: 0, right: 0, height, pointerEvents: "none",
    [dir === "up" ? "bottom" : "top"]: 0,
    background: "linear-gradient(" + (dir === "up" ? "0deg" : "180deg") + ", rgba(6,4,2,0.82) 0%, rgba(6,4,2,0.5) 44%, rgba(6,4,2,0) 100%)",
  }} />
);

// 片側（半分）の料理：写真＋下に名前（スクリム付き）。
const Half: React.FC<{ item: any; f: number; delay: number; align: "left" | "right" }> = ({ item, f, delay, align }) => {
  const nm = (item.disp && item.disp.length) ? item.disp : item.caption;
  const lines = splitLines(nm); const L = lines.length ? lines : [nm];
  const sz = heroSize(nm, 52, 38);
  const o = fade(f, delay, 18);
  return (
    <div style={{ position: "relative", width: 540, height: 1920, overflow: "hidden", opacity: o }}>
      <PhotoLayer src={item.src} frame={f} dur={YWINE_DUR} from={1.05} to={1.13} sat={1.07} brightness={0.98} />
      <Scrim dir="up" height={560} />
      <div style={{ position: "absolute", left: 34, right: 34, bottom: SAFE.bottom - 40, textAlign: "center" }}>
        {item.sub ? <div style={{ fontFamily: serif, color: "#E7A15A", fontSize: 24, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>{item.sub}</div> : null}
        <div style={{ fontFamily: mincho, color: "#FBF3E4", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.16, textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}>
          {L.map((ln, k) => <div key={k}>{ln}</div>)}
        </div>
      </div>
    </div>
  );
};

// 1ページ＝左右2品。
const Page: React.FC<{ a: any; b: any; f: number; base: number }> = ({ a, b, f, base }) => (
  <div style={{ position: "absolute", top: 0, width: 1080, height: 1920, left: 0, display: "flex", flexDirection: "row" }}>
    <Half item={a} f={f} delay={base} align="left" />
    <Half item={b} f={f} delay={base + 8} align="right" />
  </div>
);

export const YoshokuWine: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YWINE_DUR;
  const T = ytheme(theme);
  const p = typoPhotos.length ? typoPhotos : [{ src: "", caption: "", story: "", sub: "", disp: "" }];
  const items = [0, 1, 2, 3].map((i) => p[i] || p[p.length - 1]);

  // 2ページ（[0,1] → [2,3]）を横スライド。ゆっくり移行。
  const trackX = interpolate(f, [0, 150, 178, DUR], [0, 0, -1080, -1080], { ...clamp, easing: EASE });
  const midO = fade(f, 8);

  return (
    <AbsoluteFill style={{ backgroundColor: T.base, fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* スライドトラック（2ページ横並び） */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 2160, height: 1920, transform: "translateX(" + trackX + "px)" }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}><Page a={items[0]} b={items[1]} f={f} base={6} /></div>
        <div style={{ position: "absolute", left: 1080, top: 0 }}><Page a={items[2]} b={items[3]} f={f} base={158} /></div>
      </div>

      {/* 中央の細い仕切り＋丸ロゴ */}
      <div style={{ position: "absolute", left: 538, top: 0, bottom: 0, width: 4, background: "rgba(224,103,58,0.6)", opacity: midO }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 856, display: "flex", justifyContent: "center", opacity: midO }}>
        <div style={{ width: 176, height: 176, borderRadius: "50%", border: "2px solid " + T.accent, background: T.base + "E6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 44px rgba(0,0,0,0.55)" }}>
          {typoLogoRound
            ? <Img src={staticFile(typoLogoRound)} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
            : <div style={{ fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 84, lineHeight: 1 }}>&amp;</div>}
        </div>
      </div>

      <Grain opacity={0.05} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

      {/* 上：MEAT BAR＋本日のおすすめ（上スクリムで分離） */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340, pointerEvents: "none", background: "linear-gradient(180deg, rgba(6,4,2,0.8) 0%, rgba(6,4,2,0) 100%)" }} />
      <div style={{ position: "absolute", top: SAFE.top - 116, left: 0, right: 0, textAlign: "center", opacity: fade(f, 6) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 34, letterSpacing: 10, fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{T.label}</div>
        <div style={{ marginTop: 8, fontFamily: mincho, color: "#F4ECDB", fontSize: 44, fontWeight: 700, letterSpacing: 6, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>本日のおすすめ</div>
      </div>

      {/* 下：ハンドル（返信バーより上の安全域） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, textAlign: "center", opacity: fade(f, 40) }}>
        <span style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{storeName} · {handle}</span>
      </div>
    </AbsoluteFill>
  );
};
