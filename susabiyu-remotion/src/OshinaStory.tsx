import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const PAPER = "#efe7d6";
const INK = "#2a241c";
const SEAL = "#b4402f";
const SUB = "#8a7e6c";

// ゆっくりめのテンポ。1品ずつ「料理名→その写真」を大きく見せ、最後にお品書きが完成する。
const INTRO = 50;
const PER = 88;          // 1品の見せ時間（ゆっくり）
const FINALE = 120;      // 完成したお品書きを見せる時間
const N = typoPhotos.length;
const REVEAL = N * PER;
const FINALE_START = INTRO + REVEAL;
const TOTAL = INTRO + REVEAL + FINALE;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 和紙の地＋外枠（全編で共通の下地）
const Washi: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: PAPER }} />
    <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 30% 18%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%), radial-gradient(60% 50% at 80% 90%, rgba(160,140,100,0.15), rgba(160,140,100,0) 60%)" }} />
    <div style={{ position: "absolute", top: 56, left: 56, right: 56, bottom: 56, border: "2px solid rgba(42,36,28,0.32)" }} />
  </>
);

// 表題（上部に常駐）
const TitleBar: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [6, 22], [0, 1], clamp);
  const lw = interpolate(f, [12, 34], [0, 1], { ...clamp, easing: Easing.out(Easing.ease) });
  return (
    <div style={{ position: "absolute", top: 120, left: 0, width: "100%", textAlign: "center", opacity: o }}>
      <div style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 64, letterSpacing: 16 }}>お品書き</div>
      <div style={{ width: (lw * 260) + "px", height: 2, backgroundColor: SEAL, margin: "20px auto 0" }} />
    </div>
  );
};

// 1品の大写し：まず料理名 → その料理写真、の順に出す
const Reveal: React.FC<{ src: string; name: string; idx: number }> = ({ src, name, idx }) => {
  const f = useCurrentFrame();
  const start = INTRO + idx * PER;
  const t = f - start;
  if (t < 0 || t >= PER) return null;
  const all = interpolate(t, [0, 8, PER - 12, PER], [0, 1, 1, 0], clamp);
  // 料理名（先に出る）
  const nameO = interpolate(t, [4, 20], [0, 1], clamp);
  const nameY = interpolate(t, [4, 22], [28, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  // 料理写真（名前のあとに出る）
  const phO = interpolate(t, [26, 46], [0, 1], clamp);
  const phS = interpolate(t, [26, 50], [0.9, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const fs = oneLineFont(name, 880, 86, 6, 46);
  return (
    <AbsoluteFill style={{ opacity: all }}>
      {/* 何品目か */}
      <div style={{ position: "absolute", top: 300, left: 0, width: "100%", textAlign: "center", opacity: nameO }}>
        <span style={{ color: SEAL, fontFamily: mincho, fontSize: 30, letterSpacing: 10 }}>― {KAN[idx] || (idx + 1)}品目 ―</span>
      </div>
      {/* 料理名（先） */}
      <div style={{ position: "absolute", top: 380, left: 0, width: "100%", textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: fs, letterSpacing: 6, whiteSpace: "nowrap" }}>{name}</span>
      </div>
      {/* 料理写真（後） */}
      <div style={{ position: "absolute", top: 560, left: "50%", width: 620, height: 620, marginLeft: -310, opacity: phO, transform: "scale(" + phS + ")" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "8px solid #fff", boxShadow: "0 22px 50px rgba(0,0,0,0.28)" }} />
      </div>
    </AbsoluteFill>
  );
};

// 完成したお品書き：番号＋写真＋料理名を一覧で（対応が一目でわかる）
const FinalBoard: React.FC<{ storeName: string; handle: string }> = ({ storeName, handle }) => {
  const f = useCurrentFrame();
  const t = f - FINALE_START;
  if (t < 0) return null;
  const top = 360, bottom = 1560;
  const rh = (bottom - top) / Math.max(N, 1);
  const sealO = interpolate(t, [N * 9 + 10, N * 9 + 26], [0, 1], clamp);
  const sealS = interpolate(t, [N * 9 + 10, N * 9 + 30], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const footO = interpolate(t, [N * 9 + 16, N * 9 + 34], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {typoPhotos.map((p, i) => {
        const a = i * 9;                      // 上から順にパッパッと並ぶ
        const ro = interpolate(t, [a, a + 14], [0, 1], clamp);
        const rx = interpolate(t, [a, a + 16], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
        const cy = top + i * rh + rh / 2;
        const ph = Math.min(196, rh - 36);
        const fs = oneLineFont(p.caption, 470, 50, 4, 30);
        return (
          <div key={i} style={{ position: "absolute", top: cy - rh / 2, left: 110, right: 110, height: rh, display: "flex", alignItems: "center", opacity: ro, transform: "translateX(" + rx + "px)" }}>
            <span style={{ color: SEAL, fontFamily: mincho, fontSize: 40, letterSpacing: 2, width: 56, textAlign: "center" }}>{KAN[i] || (i + 1)}</span>
            <div style={{ width: ph, height: ph, marginLeft: 8, flex: "0 0 auto" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "5px solid #fff", boxShadow: "0 10px 24px rgba(0,0,0,0.22)" }} />
            </div>
            <div style={{ flex: 1, marginLeft: 30, display: "flex", alignItems: "center" }}>
              <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: fs, letterSpacing: 4, whiteSpace: "nowrap" }}>{p.caption}</span>
              <div style={{ flex: 1, borderBottom: "2px dotted rgba(42,36,28,0.3)", margin: "0 0 8px 18px" }} />
            </div>
          </div>
        );
      })}
      {/* 落款 */}
      <div style={{ position: "absolute", top: 150, right: 120, width: 72, height: 72, borderRadius: 8, border: "3px solid " + SEAL, color: SEAL, fontFamily: mincho, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", opacity: sealO, transform: "scale(" + sealS + ")" }}>旬</div>
      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 120, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontSize: 36, letterSpacing: 6, marginBottom: 12 }}>{storeName}</div>
        <div style={{ color: SUB, fontFamily: mincho, fontSize: 26, letterSpacing: 4 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const OshinaStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 18, TOTAL - 24, TOTAL], [0, 0.8, 0.8, 0], clamp)} />
      <Washi />
      <TitleBar />
      {typoPhotos.map((p, i) => (
        <Reveal key={i} src={p.src} name={p.caption} idx={i} />
      ))}
      <FinalBoard storeName={storeName} handle={handle} />
    </AbsoluteFill>
  );
};
