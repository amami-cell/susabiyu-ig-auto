import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#0c0a08";
const GOLD = "#e8c66a";
const WHITE = "#f6f1e7";
const PAD = 40;
const GAP = 16;
const COLS = 2;
const DUR = 360;          // 約12秒

// タイムライン
const TAP = 100;          // タップ
const HOLD = 40;          // 選択を見せる間
const ZS = TAP + HOLD;    // ズーム開始(=140)
const ZE = ZS + 84;       // ズーム終了(=224) … じわじわ拡大

// 料理を切らずに見せる：同じ写真をぼかして背景に敷き、本体はcontainで全体表示
const Dish: React.FC<{ src: string; zoom?: number }> = ({ src, zoom = 1 }) => (
  <>
    <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(16px) brightness(0.5)", transform: "scale(" + (1.12 * zoom) + ")" }} />
    <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")" }} />
  </>
);

// グリッド→（携帯で選んだ風：枠が光る・他が暗くなる）→タップ写真がじわじわ拡大して主役へ。
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

  // ズーム：主役セルが元位置→フルスクリーンへ（ゆっくり=じわじわ）
  const ez = { ...{ extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const }, easing: Easing.inOut(Easing.ease) };
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const hl = interpolate(f, [ZS, ZE], [hx0, 0], ez);
  const ht = interpolate(f, [ZS, ZE], [hy0, 0], ez);
  const hw = interpolate(f, [ZS, ZE], [cw, 1080], ez);
  const hh = interpolate(f, [ZS, ZE], [ch, 1920], ez);
  const hrad = interpolate(f, [ZS, ZE], [10, 0], clamp);
  const hbord = interpolate(f, [ZS, ZE], [5, 0], clamp);
  const heroZoom = interpolate(f, [ZS, DUR], [1.0, 1.12], clamp);
  const tapBounce = interpolate(f, [TAP - 8, TAP, TAP + 8, TAP + 18], [1, 0.93, 1.05, 1], clamp);

  // グリッドの他セル：登場→タップで暗くなる→ズームで消える
  const popO = (a: number) => interpolate(f, [a, a + 14], [0, 1], clamp);
  const popS = (a: number) => interpolate(f, [a, a + 16], [0.94, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const dimO = interpolate(f, [TAP, TAP + 20], [0, 0.62], clamp);          // 他を暗く（選択を際立たせる）
  const othersO = interpolate(f, [ZS, ZS + 22], [1, 0], clamp);
  const gridLabO = interpolate(f, [10, 24, TAP, TAP + 12], [0, 1, 1, 0], clamp);

  // カーソル（指）：右下→主役セル中央。押し込み＋波紋。
  const curO = interpolate(f, [38, 52, TAP + 26, TAP + 40], [0, 1, 1, 0], clamp);
  const curX = interpolate(f, [54, TAP], [880, hcx], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const curY = interpolate(f, [54, TAP], [1580, hcy], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const press = interpolate(f, [TAP - 12, TAP, TAP + 10], [1, 0.58, 1], clamp);
  const rip1O = interpolate(f, [TAP, TAP + 30], [0.9, 0], clamp);
  const rip1S = interpolate(f, [TAP, TAP + 30], [0.25, 3.2], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rip2O = interpolate(f, [TAP + 8, TAP + 42], [0.7, 0], clamp);
  const rip2S = interpolate(f, [TAP + 8, TAP + 42], [0.25, 3.7], { ...clamp, easing: Easing.out(Easing.cubic) });
  const flashO = interpolate(f, [TAP, TAP + 4, TAP + 16], [0, 0.55, 0], clamp);

  // 選択枠が金色に光る（タップ〜ズーム開始まで脈打つ）
  const selO = interpolate(f, [TAP, TAP + 8, ZS, ZS + 8], [0, 1, 1, 0], clamp);
  const glow = interpolate(f, [TAP, TAP + 8, TAP + 20, TAP + 32, ZS], [0, 1, 0.45, 1, 0.7], clamp);

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
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: cw, height: ch, opacity: popO(a), transform: "scale(" + popS(a) + ")", overflow: "hidden", borderRadius: 8, border: "4px solid #fff", boxShadow: "0 10px 24px rgba(0,0,0,0.3)", backgroundColor: "#000" }}>
              <Dish src={p.src} />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* 中央にすさび湯ロゴ（白抜き・背景なし。タップで消える） */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: gridLabO }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 780, height: "auto", filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.75))" }} />
      </AbsoluteFill>

      {/* 暗幕：タップで他を暗く（選択を際立たせる） */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dimO * othersO }} />

      {/* 主役セル（0番）：グリッド位置→フルスクリーンへズーム。タップで弾む */}
      <div style={{ position: "absolute", left: hl, top: ht, width: hw, height: hh, overflow: "hidden", borderRadius: hrad, border: hbord + "px solid #fff", boxShadow: "0 10px 24px rgba(0,0,0,0.3)", transform: "scale(" + tapBounce + ")", backgroundColor: "#000" }}>
        <Dish src={hero.src} zoom={heroZoom} />
        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flashO }} />
      </div>

      {/* 選択枠（金色に光る） */}
      <div style={{ position: "absolute", left: hx0 - 6, top: hy0 - 6, width: cw + 12, height: ch + 12, borderRadius: 14, border: "8px solid " + GOLD, boxShadow: "0 0 " + (30 + glow * 60) + "px " + (4 + glow * 12) + "px rgba(232,198,106," + (0.5 + glow * 0.5) + "), inset 0 0 30px rgba(232,198,106," + (glow * 0.5) + ")", opacity: selO }} />

      {/* タップ波紋＋指カーソル */}
      <div style={{ position: "absolute", left: hcx, top: hcy, width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: "50%", border: "7px solid " + WHITE, opacity: rip1O, transform: "scale(" + rip1S + ")" }} />
      <div style={{ position: "absolute", left: hcx, top: hcy, width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: "50%", border: "5px solid " + GOLD, opacity: rip2O, transform: "scale(" + rip2S + ")" }} />
      <div style={{ position: "absolute", left: curX, top: curY, width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "6px solid rgba(255,255,255,0.95)", boxShadow: "0 8px 22px rgba(0,0,0,0.35)", opacity: curO, transform: "scale(" + press + ")" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: "50%", background: "rgba(255,255,255,0.95)" }} />
      </div>

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
