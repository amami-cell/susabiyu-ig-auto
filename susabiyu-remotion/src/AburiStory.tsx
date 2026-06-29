import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { kaitenPhotos, kaitenMusic } from "./kaitenData";
import { oneLineFont } from "./fit";

const { fontFamily: mincho } = loadFont();
const BG = "#0a0705";
const GOLD = "#e7b24a";
const WHITE = "#f8f1e4";
const DUR = 240;          // 約8秒
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// 炙り演出：寿司のアップに、炎の光が走り湯気が立つ。「炙り」スタンプ。
export const AburiStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const hero = kaitenPhotos[0] || { src: "", caption: "" };
  const imgO = interpolate(f, [0, 12], [0, 1], clamp);
  const zoom = interpolate(f, [0, DUR], [1.06, 1.17], clamp);
  // 炎の光が左→右へ走る
  const flameX = interpolate(f, [16, 120], [-360, 1400], clamp);
  const flick = 0.5 + 0.32 * Math.abs(Math.sin(f * 0.7)) + 0.12 * Math.abs(Math.sin(f * 1.9));
  const stampS = interpolate(f, [70, 86, 94], [0, 1.16, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const stampR = interpolate(f, [70, 94], [-16, -8], clamp);
  const nameO = interpolate(f, [40, 56], [0, 1], clamp);
  const nameY = interpolate(f, [40, 58], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 820, 80, 4, 44);
  // 湯気
  const steam = [0, 1, 2, 3, 4];
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Audio src={staticFile(kaitenMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 寿司のアップ */}
      <AbsoluteFill style={{ opacity: imgO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + zoom + ")" }} />
        {/* 暖色グレーディング＋暗め */}
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(60,20,0,0.42), rgba(8,4,2,0.42))" }} />
      </AbsoluteFill>

      {/* 炎の走り */}
      <div style={{ position: "absolute", top: 0, left: flameX, width: 620, height: "100%", opacity: flick * 0.9, background: "radial-gradient(closest-side at 50% 52%, rgba(255,196,80,0.85), rgba(255,120,20,0.4) 40%, rgba(255,80,0,0) 72%)", mixBlendMode: "screen", filter: "blur(6px)" }} />
      <div style={{ position: "absolute", top: 0, left: flameX + 120, width: 360, height: "100%", opacity: flick, background: "radial-gradient(closest-side at 50% 55%, rgba(255,230,150,0.9), rgba(255,150,40,0.3) 45%, rgba(0,0,0,0) 72%)", mixBlendMode: "screen", filter: "blur(4px)" }} />

      {/* 湯気 */}
      {steam.map((i) => {
        const ph = (f * 1.5 + i * 38) % 170;
        const y = 980 - ph * 5.2;
        const o = Math.sin((ph / 170) * Math.PI) * 0.35;
        const x = 220 + i * 150 + Math.sin((f + i * 30) * 0.06) * 30;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 120, height: 200, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.5), rgba(255,255,255,0))", opacity: o, filter: "blur(14px)" }} />;
      })}

      {/* 炙りスタンプ */}
      <div style={{ position: "absolute", top: 250, right: 86, width: 220, height: 220, transform: "scale(" + stampS + ") rotate(" + stampR + "deg)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "6px solid " + GOLD, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(120,30,10,0.82)", boxShadow: "0 12px 30px rgba(0,0,0,0.5), 0 0 40px rgba(255,140,40,0.5)" }}>
          <span style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: 96, letterSpacing: 4 }}>炙り</span>
        </div>
      </div>

      {/* 料理名 */}
      <div style={{ position: "absolute", bottom: 240, left: 80, right: 80, opacity: nameO, transform: "translateY(" + nameY + "px)" }}>
        <div style={{ color: GOLD, fontFamily: mincho, fontSize: 30, letterSpacing: 8, marginBottom: 14 }}>香ばしく、ひと炙り。</div>
        <div style={{ color: WHITE, fontFamily: mincho, fontWeight: 700, fontSize: nm, letterSpacing: 4, whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>{hero.caption}</div>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 120, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: WHITE, fontFamily: mincho, fontSize: 28, letterSpacing: 5 }}>{storeName}　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const ABURI_DUR = DUR;
