// 大衆・グリッド→ズーム：烏丸「グリッド→ズーム」(GridZoom)の動き（タップ→選択→ズーム）
// そのままに、紺のれんの大衆食堂トーンへ。金の光→黄札、明朝→太ゴシック＋筆。
// 提灯・祭りの道具は使わない（紺×生成りで世界観を分ける）。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { tempoPhotos, tempoMusic } from "./tempoData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const NAVY = "#17294a";
const NAVY2 = "#0f1d36";
const KINARI = "#f2e8d0";     // 生成り（セルのフチ）
const PAD = 40;
const GAP = 16;
const COLS = 2;
const DUR = 360;

const TAP = 100;
const HOLD = 40;
const ZS = TAP + HOLD;
const ZE = ZS + 84;

const Dish: React.FC<{ src: string; zoom?: number }> = ({ src, zoom = 1 }) => (
  <>
    <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(16px) brightness(0.55) saturate(1.3)", transform: "scale(" + (1.12 * zoom) + ")" }} />
    <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")", filter: "saturate(1.1) contrast(1.04)" }} />
  </>
);

export const TaishuGrid: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const _all = tempoPhotos.slice(0, 6);
  const _isSushi = (c: string) => /寿司|鮨|握り|にぎり|巻き|刺身/.test(c || "");
  const _si = _all.findIndex((p) => _isSushi(p.caption));
  const photos = _si > 0 ? [_all[_si]].concat(_all.filter((_, i) => i !== _si)) : _all;
  const n = Math.max(photos.length, 1);
  const rows = Math.ceil(n / COLS);
  const cw = (1080 - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const ch = (1920 - PAD * 2 - GAP * (rows - 1)) / rows;
  const hero = photos[0] || { src: "", caption: "" };

  const hx0 = PAD, hy0 = PAD;
  const hcx = hx0 + cw / 2, hcy = hy0 + ch / 2;

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

  const popO = (a: number) => interpolate(f, [a, a + 14], [0, 1], clamp);
  const popS = (a: number) => interpolate(f, [a, a + 16], [0.94, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const dimO = interpolate(f, [TAP, TAP + 20], [0, 0.62], clamp);
  const othersO = interpolate(f, [ZS, ZS + 22], [1, 0], clamp);
  const gridLabO = interpolate(f, [10, 24, TAP, TAP + 12], [0, 1, 1, 0], clamp);

  const curO = interpolate(f, [38, 52, TAP + 26, TAP + 40], [0, 1, 1, 0], clamp);
  const curX = interpolate(f, [54, TAP], [880, hcx], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const curY = interpolate(f, [54, TAP], [1580, hcy], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const press = interpolate(f, [TAP - 12, TAP, TAP + 10], [1, 0.58, 1], clamp);
  const rip1O = interpolate(f, [TAP, TAP + 30], [0.9, 0], clamp);
  const rip1S = interpolate(f, [TAP, TAP + 30], [0.25, 3.2], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rip2O = interpolate(f, [TAP + 8, TAP + 42], [0.7, 0], clamp);
  const rip2S = interpolate(f, [TAP + 8, TAP + 42], [0.25, 3.7], { ...clamp, easing: Easing.out(Easing.cubic) });
  const flashO = interpolate(f, [TAP, TAP + 4, TAP + 16], [0, 0.55, 0], clamp);

  const selO = interpolate(f, [TAP, TAP + 8, ZS, ZS + 8], [0, 1, 1, 0], clamp);
  const glow = interpolate(f, [TAP, TAP + 8, TAP + 20, TAP + 32, ZS], [0, 1, 0.45, 1, 0.7], clamp);

  const nameO = interpolate(f, [ZE + 6, ZE + 24], [0, 1], clamp);
  const nameY = interpolate(f, [ZE + 6, ZE + 26], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const labO = interpolate(f, [ZE + 2, ZE + 18], [0, 1], clamp);
  const labS = interpolate(f, [ZE + 2, ZE + 8], [2.2, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const footO = interpolate(f, [DUR - 38, DUR - 24], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 780, 72, 2, 42);

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY2 }}>
      <Audio src={staticFile(tempoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 紺のれんの地（縦じま） */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, " + NAVY + " 0 214px, " + NAVY2 + " 214px 220px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.35) 100%)" }} />

      <AbsoluteFill style={{ opacity: othersO }}>
        {photos.map((p, i) => {
          if (i === 0) return null;
          const col = i % COLS, row = Math.floor(i / COLS);
          const x = PAD + col * (cw + GAP);
          const y = PAD + row * (ch + GAP);
          const a = i * 8;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: cw, height: ch, opacity: popO(a), transform: "scale(" + popS(a) + ") rotate(" + (i % 2 === 0 ? -0.8 : 0.8) + "deg)", overflow: "hidden", borderRadius: 8, border: "5px solid " + KINARI, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", backgroundColor: "#000" }}>
              <Dish src={p.src} />
            </div>
          );
        })}
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: gridLabO }}>
        <Img src={staticFile("storelogo_white.png")} style={{ width: 780, height: "auto", filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.75))" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dimO * othersO }} />

      <div style={{ position: "absolute", left: hl, top: ht, width: hw, height: hh, overflow: "hidden", borderRadius: hrad, border: hbord + "px solid " + KINARI, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", transform: "scale(" + tapBounce + ")", backgroundColor: "#000" }}>
        <Dish src={hero.src} zoom={heroZoom} />
        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flashO }} />
      </div>

      {/* 選択枠：黄色に光る（金→黄） */}
      <div style={{ position: "absolute", left: hx0 - 6, top: hy0 - 6, width: cw + 12, height: ch + 12, borderRadius: 14, border: "8px solid " + KIIRO, boxShadow: "0 0 " + (30 + glow * 60) + "px " + (4 + glow * 12) + "px rgba(255,210,63," + (0.5 + glow * 0.5) + "), inset 0 0 30px rgba(255,210,63," + (glow * 0.5) + ")", opacity: selO }} />

      <div style={{ position: "absolute", left: hcx, top: hcy, width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: "50%", border: "7px solid " + KINARI, opacity: rip1O, transform: "scale(" + rip1S + ")" }} />
      <div style={{ position: "absolute", left: hcx, top: hcy, width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: "50%", border: "5px solid " + KIIRO, opacity: rip2O, transform: "scale(" + rip2S + ")" }} />
      <div style={{ position: "absolute", left: curX, top: curY, width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "6px solid rgba(255,255,255,0.95)", boxShadow: "0 8px 22px rgba(0,0,0,0.35)", opacity: curO, transform: "scale(" + press + ")" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: "50%", background: "rgba(255,255,255,0.95)" }} />
      </div>

      {/* ズーム後：黄札＋朱帯の品名 */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(15,29,54,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 48%, rgba(10,16,30,0.88) 100%)", opacity: labO }} />
        <div style={{ position: "absolute", top: 130, left: 76, opacity: labO, transform: "rotate(-6deg) scale(" + labS + ")", transformOrigin: "left top" }}>
          <span style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "10px 24px",
            color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 38, whiteSpace: "nowrap", boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>本日のオススメ</span>
        </div>
        <div style={{ position: "absolute", bottom: 240, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
          <div style={{ display: "inline-block", background: AKA, border: "5px solid " + KINARI, borderRadius: 8, padding: "16px 46px",
            transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
            <span style={{ color: "#fff6e8", fontFamily: fude, fontSize: nm, letterSpacing: 2, whiteSpace: "nowrap" }}>{hero.caption}</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 110, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
          <span style={{ color: KINARI, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>{storeName}　{handle}</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TGRID_DUR = DUR;
