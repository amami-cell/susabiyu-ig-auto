// 洋食フィード投稿画像テンプレ集（4:5＝1080×1350・静止画）。
// ストーリー(9:16)とは別に、フィード投稿1枚絵の“デザイン候補”を複数パターン用意する。
// 静止画なので入場アニメは使わず「完成状態」で組む（どのフレームでも同じ見た目）。
// 料理写真＝typoPhotos[0]、料理名＝caption、短句＝story を各パターンが別レイアウトで見せる。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { typoPhotos } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import { mincho, serif, Grain, Vignette, StoreLogo, splitLines, heroSize } from "./yoshokuDesign";

export const FEED_W = 1080;
export const FEED_H = 1350;
export const FEED_DUR = 1; // 静止画（stillで1フレーム抜く）

type P = { storeName?: string; handle?: string; theme?: string };
const D = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };

function dish() {
  return typoPhotos[0] || { src: "", caption: "", story: "" };
}
const Photo: React.FC<{ src: string; pos?: string; bri?: number; sat?: number; style?: React.CSSProperties }> = ({ src, pos, bri = 1, sat = 1.06, style }) => (
  <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos || "center", filter: "brightness(" + bri + ") saturate(" + sat + ")", ...style }} />
);
function Name({ text, size, color, ls = 1, lh = 1.16, shadow }: { text: string; size: number; color: string; ls?: number; lh?: number; shadow?: string }) {
  const lines = splitLines(text);
  return (
    <div style={{ fontFamily: mincho, color, fontSize: size, fontWeight: 700, letterSpacing: ls, lineHeight: lh, textShadow: shadow }}>
      {lines.length ? lines.map((l, i) => <div key={i}>{l}</div>) : text}
    </div>
  );
}

// ①エディトリアル：上に写真、下は生成りパネルに料理名＋短句＋ロゴ（王道・清潔）
export const YoshokuFeedA: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 78, 52);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 858, overflow: "hidden" }}>
        <Photo src={d.src} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 30%)" }} />
      </div>
      <div style={{ position: "absolute", top: 30, left: 40, fontFamily: serif, color: "#fff", fontSize: 26, letterSpacing: 6, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{T.label}</div>
      <div style={{ position: "absolute", top: 858, left: 0, right: 0, bottom: 0, padding: "44px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ width: 92, height: 3, background: T.accent, marginBottom: 22 }} />
        <Name text={d.caption} size={sz} color={T.ink} />
        {d.story ? <div style={{ marginTop: 14, fontFamily: mincho, color: T.sub, fontSize: 34, letterSpacing: 2 }}>{d.story}</div> : null}
        <div style={{ marginTop: 22, fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 4 }}>{storeName}　{handle}</div>
      </div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// ②シネマ：全面写真＋下グラデに大きな料理名（写真主役・迫力）
export const YoshokuFeedB: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 92, 58);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo src={d.src} bri={1.0} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.85) 100%)" }} />
      <div style={{ position: "absolute", top: 34, left: 44, display: "flex", alignItems: "center", gap: 14 }}>
        <StoreLogo storeName={storeName} height={58} tint="#fff" />
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 60 }}>
        <div style={{ width: 84, height: 3, background: T.accent, marginBottom: 20 }} />
        <Name text={d.caption} size={sz} color="#fff" shadow="0 3px 24px rgba(0,0,0,0.8)" />
        {d.story ? <div style={{ marginTop: 12, fontFamily: mincho, color: "#F3E7CF", fontSize: 34, letterSpacing: 2, textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>{d.story}</div> : null}
        <div style={{ marginTop: 18, fontFamily: serif, color: T.accent, fontSize: 25, letterSpacing: 4 }}>{handle}</div>
      </div>
      <Vignette strength={0.4} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ③黒板トラットリア：濃緑の黒板に額装写真＋白チョーク文字（親しみ×高級）
export const YoshokuFeedC: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 76, 50);
  return (
    <AbsoluteFill style={{ backgroundColor: "#12181a" }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 22%, #223029 0%, #141c1d 55%, #0a0f10 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 22px)" }} />
      <div style={{ position: "absolute", inset: 40, border: "1px solid " + T.accent + "66", borderRadius: 8 }} />
      <div style={{ position: "absolute", top: 66, left: 0, right: 0, textAlign: "center", fontFamily: serif, fontStyle: "italic", color: "#EFEDE4", fontSize: 40, letterSpacing: 6 }}>{T.label}</div>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", padding: "0 70px" }}>
        <div style={{ display: "inline-block" }}><Name text={d.caption} size={sz} color="#F4F2EA" ls={2} shadow="0 1px 0 rgba(255,255,255,0.2),0 4px 18px rgba(0,0,0,0.5)" /></div>
        {d.story ? <div style={{ marginTop: 12, fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 32, letterSpacing: 3 }}>{d.story}</div> : null}
      </div>
      <div style={{ position: "absolute", top: 470, left: 165, width: 750, height: 640 }}>
        <div style={{ position: "absolute", inset: 0, background: "#F3EEE2", borderRadius: 6, padding: 16, boxShadow: "0 30px 66px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", inset: 16, border: "1px solid rgba(150,120,60,0.55)", borderRadius: 3, overflow: "hidden" }}><Photo src={d.src} /></div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 66, textAlign: "center", fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 5 }}>{storeName}　{handle}</div>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

// ④金枠ミニマル：中央に写真、細い金枠、上下に料理名＋短句（上品・静か）
export const YoshokuFeedD: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 70, 48);
  return (
    <AbsoluteFill style={{ backgroundColor: T.footBase }}>
      <div style={{ position: "absolute", inset: 46, border: "1px solid " + T.accent + "55" }} />
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 8 }}>{T.label}</div>
      <div style={{ position: "absolute", top: 175, left: 150, width: 780, height: 780 }}>
        <div style={{ position: "absolute", inset: 0, border: "1px solid " + T.accent + "aa", overflow: "hidden" }}><Photo src={d.src} /></div>
      </div>
      <div style={{ position: "absolute", top: 1000, left: 0, right: 0, textAlign: "center", padding: "0 80px" }}>
        <div style={{ display: "inline-block" }}><Name text={d.caption} size={sz} color={T.ink} ls={2} /></div>
        {d.story ? <div style={{ marginTop: 12, fontFamily: mincho, color: T.sub, fontSize: 30, letterSpacing: 2 }}>{d.story}</div> : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// ⑤スプリット：左に写真／右に生成りパネルで料理名＋短句（雑誌の見開き風）
export const YoshokuFeedE: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 64, 46);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 620, overflow: "hidden" }}><Photo src={d.src} /></div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 620, right: 0, padding: "0 46px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 6, marginBottom: 18 }}>{T.label}</div>
        <Name text={d.caption} size={sz} color={T.ink} ls={1} lh={1.24} />
        {d.story ? <div style={{ marginTop: 16, fontFamily: mincho, color: T.sub, fontSize: 30, letterSpacing: 1 }}>{d.story}</div> : null}
        <div style={{ marginTop: 22, width: 70, height: 3, background: T.accent }} />
        <div style={{ marginTop: 22, fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 4 }}>{storeName}</div>
        <div style={{ marginTop: 4, fontFamily: serif, color: T.sub, fontSize: 22, letterSpacing: 3 }}>{handle}</div>
      </div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// ⑥ポラロイド：温かい卓上に1枚のポラロイド（親しみ・SNS映え）
export const YoshokuFeedF: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 52, 40);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 42%, #3c2e22 0%, #2a2016 52%, #1c150e 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,240,220,0.5) 0 1px, transparent 1px 30px)" }} />
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: serif, color: T.accent, fontSize: 30, letterSpacing: 8 }}>{T.label}</div>
      <div style={{ position: "absolute", left: "50%", top: 150, transform: "translateX(-50%) rotate(-2.5deg)", width: 760, background: "#FBF7EE", padding: "26px 26px 0", borderRadius: 6, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 708, height: 708, overflow: "hidden", background: "#000" }}><Photo src={d.src} /></div>
        <div style={{ minHeight: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px" }}>
          <div style={{ fontFamily: mincho, color: "#2a2420", fontSize: sz, fontWeight: 700, textAlign: "center", letterSpacing: 1 }}>{d.caption}</div>
          {d.story ? <div style={{ fontFamily: mincho, color: "#7a6748", fontSize: 26, letterSpacing: 1 }}>{d.story}</div> : null}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", fontFamily: serif, color: "#EFE3CE", fontSize: 26, letterSpacing: 5 }}>{storeName}　{handle}</div>
      <Grain opacity={0.09} />
    </AbsoluteFill>
  );
};

// ⑦販促「本日のおすすめ」：上に帯、写真主役、下に料理名＋短句（集客向き）
export const YoshokuFeedG: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 80, 54);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo src={d.src} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.1) 58%, rgba(0,0,0,0.86) 100%)" }} />
      <div style={{ position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)", padding: "12px 34px", border: "1px solid " + T.accent, borderRadius: 999, background: "rgba(10,10,12,0.4)" }}>
        <span style={{ fontFamily: mincho, color: "#fff", fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>本日のおすすめ</span>
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 66, textAlign: "center" }}>
        <div style={{ display: "inline-block" }}><Name text={d.caption} size={sz} color="#fff" ls={1} shadow="0 3px 22px rgba(0,0,0,0.8)" /></div>
        {d.story ? <div style={{ marginTop: 12, fontFamily: serif, fontStyle: "italic", color: T.accent, fontSize: 34, letterSpacing: 2 }}>{d.story}</div> : null}
        <div style={{ marginTop: 16, fontFamily: serif, color: "#EDE4D2", fontSize: 25, letterSpacing: 4 }}>{storeName}　{handle}</div>
      </div>
      <Vignette strength={0.44} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ⑧大タイポ＋インセット写真：上にキャッチ大、下に小さめ写真枠（雑誌カバー風）
export const YoshokuFeedH: React.FC<P> = ({ storeName = D.storeName, handle = D.handle, theme = D.theme }) => {
  const T = ytheme(theme); const d = dish(); const sz = heroSize(d.caption, 92, 60);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, " + T.base + " 0%, " + T.footBase + " 100%)" }}>
      <div style={{ position: "absolute", top: 70, left: 56, right: 56 }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 26, letterSpacing: 8, marginBottom: 18 }}>{T.label}</div>
        <Name text={d.caption} size={sz} color={T.ink} ls={2} lh={1.2} shadow="0 2px 14px rgba(0,0,0,0.4)" />
        {d.story ? <div style={{ marginTop: 16, fontFamily: mincho, color: T.sub, fontSize: 34, letterSpacing: 2 }}>{d.story}</div> : null}
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 96, height: 620, overflow: "hidden", borderRadius: 10, border: "1px solid " + T.accent + "55", boxShadow: "0 30px 70px rgba(0,0,0,0.5)" }}>
        <Photo src={d.src} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{storeName}　{handle}</div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

export const FEED_COMPS: { id: string; label: string; comp: React.FC<P> }[] = [
  { id: "YoshokuFeedA", label: "フィード案A・エディトリアル(上写真＋下パネル)", comp: YoshokuFeedA },
  { id: "YoshokuFeedB", label: "フィード案B・シネマ(全面写真＋大見出し)", comp: YoshokuFeedB },
  { id: "YoshokuFeedC", label: "フィード案C・黒板トラットリア(額装)", comp: YoshokuFeedC },
  { id: "YoshokuFeedD", label: "フィード案D・金枠ミニマル(中央写真)", comp: YoshokuFeedD },
  { id: "YoshokuFeedE", label: "フィード案E・スプリット(左写真右テキスト)", comp: YoshokuFeedE },
  { id: "YoshokuFeedF", label: "フィード案F・ポラロイド(卓上)", comp: YoshokuFeedF },
  { id: "YoshokuFeedG", label: "フィード案G・本日のおすすめ帯(販促)", comp: YoshokuFeedG },
  { id: "YoshokuFeedH", label: "フィード案H・大タイポ＋インセット写真", comp: YoshokuFeedH },
];
