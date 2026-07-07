// 大衆・お品書き：烏丸「お品書き」(OshinaStory)の構成（1品ずつ紹介→最後に一覧完成）
// そのままに、和紙×明朝 → レトロ紙×筆文字×黄札番号×赤ハンコの大衆トーンへ。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { typoPhotos, typoMusic } from "./typoData";
import { oneLineFont, kanjiNum } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, Halftone, Tex } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const KAMI = "#f0dcae";
const SUMI = "#33231a";
const INTRO = 50;
const PER = 88;
const FINALE = 120;
const N = typoPhotos.length;
const FINALE_START = INTRO + N * PER;
export const TOSHINA_DUR = INTRO + N * PER + FINALE;
const KAN = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// レトロ紙の下地（網点＋紙質感＋枠）
const Kami: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: KAMI }} />
    <Halftone opacity={0.13} color="rgba(120,45,15,0.6)" />
    <Tex opacity={0.15} blend="multiply" />
    <div style={{ position: "absolute", top: 48, left: 48, right: 48, bottom: 48, border: "4px solid " + SUMI, borderRadius: 4 }} />
    <div style={{ position: "absolute", top: 62, left: 62, right: 62, bottom: 62, border: "2px solid rgba(51,35,26,0.4)", borderRadius: 4 }} />
  </>
);

// 表題（上部に常駐）＋赤丸ハンコ
const TitleBar: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [6, 20], [0, 1], clamp);
  const sealS = interpolate(f, [18, 23], [2.4, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const sealO = f >= 18 ? 1 : 0;
  return (
    <div style={{ position: "absolute", top: 100, left: 0, width: "100%", textAlign: "center", opacity: o }}>
      <span style={{ color: SUMI, fontFamily: fude, fontSize: 84, letterSpacing: 8 }}>本日のおしながき</span>
      <div style={{ position: "absolute", top: -16, right: 80, transform: "rotate(9deg) scale(" + sealS + ")", opacity: sealO }}>
        <div style={{ width: 112, height: 112, borderRadius: "50%", border: "7px solid " + AKA, background: "rgba(250,242,226,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(90,35,5,0.35)" }}>
          <span style={{ color: AKA, fontFamily: fude, fontSize: 60 }}>旨</span>
        </div>
      </div>
    </div>
  );
};

// 1品の大写し：黄札の「一品目」→ 筆文字の品名 → 白フチ写真
const Reveal: React.FC<{ src: string; name: string; idx: number }> = ({ src, name, idx }) => {
  const f = useCurrentFrame();
  const start = INTRO + idx * PER;
  const t = f - start;
  if (t < 0 || t >= PER) return null;
  const all = interpolate(t, [0, 8, PER - 12, PER], [0, 1, 1, 0], clamp);
  const tagS = interpolate(t, [4, 10], [2.0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tagO = interpolate(t, [4, 8], [0, 1], clamp);
  const nameO = interpolate(t, [12, 26], [0, 1], clamp);
  const nameY = interpolate(t, [12, 28], [28, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const phO = interpolate(t, [26, 44], [0, 1], clamp);
  const phS = interpolate(t, [26, 48], [1.35, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const disp = kanjiNum(name);
  const fs = oneLineFont(disp, 900, 104, 4, 54);
  return (
    <AbsoluteFill style={{ opacity: all }}>
      {/* 何品目か（黄札） */}
      <div style={{ position: "absolute", top: 268, left: 0, width: "100%", textAlign: "center", opacity: tagO }}>
        <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "10px 34px",
          color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 46, transform: "rotate(-2deg) scale(" + tagS + ")",
          boxShadow: "5px 7px 0 rgba(0,0,0,0.25)" }}>{KAN[idx] || (idx + 1)}品目</span>
      </div>
      {/* 品名（筆文字・先） */}
      <div style={{ position: "absolute", top: 392, left: 0, width: "100%", textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <span style={{ color: SUMI, fontFamily: fude, fontSize: fs, letterSpacing: 4, whiteSpace: "nowrap" }}>{disp}</span>
      </div>
      {/* 写真（後・白フチで傾けて） */}
      <div style={{ position: "absolute", top: 566, left: "50%", width: 780, height: 780, marginLeft: -390, opacity: phO,
        transform: "scale(" + phS + ") rotate(" + (idx % 2 === 0 ? -2 : 2) + "deg)" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "12px solid #fdf6e6",
          borderRadius: 6, boxShadow: "0 22px 50px rgba(90,35,5,0.4)" }} />
      </div>
    </AbsoluteFill>
  );
};

// 完成したお品書き一覧
const FinalBoard: React.FC<{ storeName: string; handle: string }> = ({ storeName, handle }) => {
  const f = useCurrentFrame();
  const t = f - FINALE_START;
  if (t < 0) return null;
  const top = 290, bottom = 1660;
  const rh = (bottom - top) / Math.max(N, 1);
  const footO = interpolate(t, [N * 9 + 16, N * 9 + 34], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {typoPhotos.map((p, i) => {
        const a = i * 9;
        const ro = interpolate(t, [a, a + 14], [0, 1], clamp);
        const rx = interpolate(t, [a, a + 16], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
        const cy = top + i * rh + rh / 2;
        const ph = Math.min(240, rh - 28);
        const nm = kanjiNum(p.caption);
        const fs = oneLineFont(nm, 560, 64, 2, 36);
        return (
          <div key={i} style={{ position: "absolute", top: cy - rh / 2, left: 88, right: 88, height: rh, display: "flex", alignItems: "center", opacity: ro, transform: "translateX(" + rx + "px)" }}>
            <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, width: 78, height: 78,
              lineHeight: "68px", textAlign: "center", color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 44, flex: "0 0 auto" }}>{KAN[i] || (i + 1)}</span>
            <div style={{ width: ph, height: ph, marginLeft: 20, flex: "0 0 auto" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "6px solid #fdf6e6", borderRadius: 4, boxShadow: "0 10px 24px rgba(90,35,5,0.3)" }} />
            </div>
            <div style={{ flex: 1, marginLeft: 28, display: "flex", alignItems: "center" }}>
              <span style={{ color: SUMI, fontFamily: fude, fontSize: fs, letterSpacing: 2, whiteSpace: "nowrap" }}>{nm}</span>
              <div style={{ flex: 1, borderBottom: "3px dotted rgba(51,35,26,0.4)", margin: "0 0 8px 16px" }} />
            </div>
          </div>
        );
      })}
      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 84, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: SUMI, fontFamily: fude, fontSize: 52, letterSpacing: 4, marginBottom: 10 }}>{storeName}</div>
        <div style={{ color: "#7a6248", fontFamily: goshi, fontWeight: 800, fontSize: 34, letterSpacing: 1 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const TaishuOshina: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: KAMI }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 18, TOSHINA_DUR - 24, TOSHINA_DUR], [0, 0.8, 0.8, 0], clamp)} />
      <Kami />
      <TitleBar />
      {typoPhotos.map((p, i) => (
        <Reveal key={i} src={p.src} name={p.caption} idx={i} />
      ))}
      <FinalBoard storeName={storeName} handle={handle} />
    </AbsoluteFill>
  );
};
