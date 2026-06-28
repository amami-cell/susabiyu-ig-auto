import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/ShipporiMincho";
import { typoPhotos, typoMusic } from "./typoData";

const { fontFamily: mincho } = loadFont();
const PAPER = "#efe7d6";
const INK = "#2a241c";
const SEAL = "#b4402f";
const SUB = "#8a7e6c";
const HEAD = 34;
const ITEM = 24;
const HOLD = 46;
const N = typoPhotos.length;
const TOTAL = HEAD + N * ITEM + HOLD;

export const OshinaStory: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯 河原町三条店", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const titleO = interpolate(f, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleX = interpolate(f, [0, 18], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const photoO = interpolate(f, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footO = interpolate(f, [HEAD + N * ITEM - 6, HEAD + N * ITEM + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 16, TOTAL - 20, TOTAL], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      {/* 和紙の風合い（淡いムラ） */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 30% 20%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%), radial-gradient(60% 50% at 80% 90%, rgba(160,140,100,0.15), rgba(160,140,100,0) 60%)" }} />
      {/* 外枠の罫 */}
      <div style={{ position: "absolute", top: 64, left: 64, right: 64, bottom: 64, border: "2px solid rgba(42,36,28,0.35)" }} />

      {/* 表題（縦書き） */}
      <div style={{ position: "absolute", top: 110, right: 110, writingMode: "vertical-rl", opacity: titleO, transform: "translateX(" + titleX + "px)" }}>
        <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 66, letterSpacing: 8 }}>お品書き</span>
      </div>
      {/* 落款 */}
      <div style={{ position: "absolute", top: 370, right: 122, width: 64, height: 64, borderRadius: 8, border: "3px solid " + SEAL, color: SEAL, fontFamily: mincho, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", opacity: titleO }}>旬</div>

      {/* 品書き（縦書きの列を右から左へ） */}
      <div style={{ position: "absolute", top: 150, right: 240, left: 110, bottom: 560, display: "flex", flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "flex-start", gap: 56 }}>
        {typoPhotos.map((p, i) => {
          const a = HEAD + i * ITEM;
          const io = interpolate(f, [a, a + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const iy = interpolate(f, [a, a + 16], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ writingMode: "vertical-rl", opacity: io, transform: "translateY(" + iy + "px)" }}>
              <span style={{ color: INK, fontFamily: mincho, fontWeight: 600, fontSize: 46, letterSpacing: 6 }}>{p.caption}</span>
            </div>
          );
        })}
      </div>

      {/* 一枚だけ写真を額装 */}
      <div style={{ position: "absolute", left: 104, bottom: 250, width: 420, height: 300, opacity: photoO }}>
        <Img src={staticFile(typoPhotos[0].src)} style={{ width: "100%", height: "100%", objectFit: "cover", border: "6px solid #fff", boxShadow: "0 18px 40px rgba(0,0,0,0.25)" }} />
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 120, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <div style={{ color: INK, fontFamily: mincho, fontSize: 36, letterSpacing: 6, marginBottom: 12 }}>{storeName}</div>
        <div style={{ color: SUB, fontFamily: mincho, fontSize: 26, letterSpacing: 4 }}>京都・河原町三条　{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
