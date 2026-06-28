import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#0c0a08";
const GOLD = "#d8b25a";
const WHITE = "#f6f1e7";
const PAD = 40;
const GAP = 16;
const COLS = 2;
const DUR = 330;         // 約11秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// タイムライン
const POP = 56;          // グリッドが出そろう
const TAP = 104;         // ここで「選択（タップ）」
const ZS = 112, ZE = 178; // ズーム区間（選んだ写真がフルスクリーンへ）

// グリッド→（携帯で選んだ風）→選んだ写真にズーム→主役フルスクリーン。
export const GridZoom: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const photos = tempoPhotos.slice(0, 6);
  const n = Math.max(photos.length, 1);
  const rows = Math.ceil(n / COLS);
  const cw = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const ch = (1920 - PAD * 2 - GAP * (rows - 1)) / rows;
  const hero = photos[0] || { src: "", caption: "" };

  // 主役セル(0番)の元の位置
  const hx0 = PAD, hy0 = PAD;
  const hcx = hx0 + cw / 2, hcy = hy0 + ch / 2;

  // ズーム：主役セルが元位置→フルスクリーンへ
  const hl = interpolate(f, [ZS, ZE], [hx0, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ht = interpolate(f, [ZS, ZE], [hy0, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const hw = interpolate(f, [ZS, ZE], [cw, 1080], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const hh = interpolate(f, [ZS, ZE], [ch, 1920], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const hrad = interpolate(f, [ZS, ZE], [8, 0], clamp);
  const hbord = interpolate(f, [ZS, ZE], [4, 0], clamp);
  const heroZoom = interpolate(f, [ZE, DUR], [1.0, 1.12], clamp);

  // 他のセルはズーム時に消える
  const othersO = interpolate(f, [ZS, ZS + 26], [1, 0], clamp);
  const gridLabO = interpolate(f, [10, 24, TAP, TAP + 14], [0, 1, 1, 0], clamp);

  // カーソル（指）の動き：右下→主役セル中央。TAPで波紋。
  const curO = interpolate(f, [40, 54, TAP + 20, TAP + 34], [0, 1, 1, 0], clamp);
  const curX = interpolate(f, [56, TAP], [840, hcx], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const curY = interpolate(f, [56, TAP], [1560, hcy], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const press = interpolate(f, [TAP - 8, TAP, TAP + 8], [1, 0.82, 1], clamp);
  const ripO = interpolate(f, [TAP, TAP + 26], [0.7, 0], clamp);
  const ripS = interpolate(f, [TAP, TAP + 26], [0.3, 2.4], clamp);
  // 選択枠（主役セルが選ばれた印）
  const selO = interpolate(f, [TAP, TAP + 10, ZS, ZS + 8], [0, 1, 1, 0], clamp);

  // 主役の名前（ズーム後）
  const nameO = interpolate(f, [ZE + 6, ZE + 24], [0, 1], clamp);
  const nameY = interpolate(f, [ZE + 6, ZE + 26], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const labO = interpolate(f, [ZE + 2, ZE + 18], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 38, DUR - 24], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 840, 84, 4, 46);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(tempoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />

      {/* グリッド（1〜5番。0番は下のズーム要素が担当） */}
      <AbsoluteFill style={{ opacity: othersO }}>
        {photos.map((p, i) => {
          if (i === 0) return null;
          const col = i % COLS, row = Math.floor(i / COLS);
          const x = PAD + col * (cw + GAP);
          const y = PAD + row * (ch + GAP);
          const a = i * 8;
          const o = interpolate(f, [a, a + 14], [0, 1], clamp);
          const s = interpolate(f, [a, a + 16], [0.94, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: cw, height: ch, opacity: o, transform: "scale(" + s + ")", overflow: "hidden", borderRadius: 8, border: "4px solid #fff", boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", top: 70, left: 0, width: "100%", textAlign: "center", opacity: gridLabO }}>
          <span style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 38, letterSpacing: 8, background: "rgba(12,10,8,0.6)", padding: "10px 26px", borderRadius: 8 }}>気になる一枚を…</span>
        </div>
      </AbsoluteFill>

      {/* 主役セル（0番）：グリッド位置→フルスクリーンへズーム */}
      <div style={{ position: "absolute", left: hl, top: ht, width: hw, height: hh, overflow: "hidden", borderRadius: hrad, border: hbord + "px solid #fff", boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + heroZoom + ")" }} />
      </div>

      {/* 選択枠 */}
      <div style={{ position: "absolute", left: hx0 - 4, top: hy0 - 4, width: cw + 8, height: ch + 8, borderRadius: 12, border: "6px solid " + GOLD, boxShadow: "0 0 0 4px rgba(216,178,90,0.4)", opacity: selO }} />

      {/* タップ波紋＋カーソル */}
      <div style={{ position: "absolute", left: hcx, top: hcy, width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: "50%", border: "5px solid " + WHITE, opacity: ripO, transform: "scale(" + ripS + ")" }} />
      <div style={{ position: "absolute", left: curX, top: curY, width: 86, height: 86, marginLeft: -43, marginTop: -43, borderRadius: "50%", background: "rgba(255,255,255,0.28)", border: "4px solid rgba(255,255,255,0.9)", opacity: curO, transform: "scale(" + press + ")" }} />

      {/* 主役の見出し・名前（ズーム後） */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.85) 100%)", opacity: labO }} />
        <div style={{ position: "absolute", top: 130, left: 80, opacity: labO, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 30, height: 2, backgroundColor: GOLD }} />
          <span style={{ color: GOLD, fontFamily: mincho, fontSize: 28, letterSpacing: 10 }}>これに決めた</span>
        </div>
        <div style={{ position: "absolute", bottom: 250, left: 80, right: 80, opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
          <div style={{ width: 110, height: 5, backgroundColor: GOLD, marginBottom: 22 }} />
          <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: nm, letterSpacing: 4, whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>{hero.caption}</div>
        </div>
        <div style={{ position: "absolute", bottom: 110, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
          <div style={{ color: WHITE, fontFamily: mincho, fontSize: 28, letterSpacing: 5 }}>{storeName}　{handle}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const GRIDZOOM_DUR = DUR;
