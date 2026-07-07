// CapCut参考④「FOOD promotion / ORDER NOW」風：高級感のある暗いトーン。
// 9枚グリッドが組み上がり→中央が回転ブラー→1枚にズーム→全画面の料理→ORDER NOW。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/Montserrat";
import { pick, capUptempo } from "./capData";
import { Cine, Flash } from "./cine";

const { fontFamily: sans } = loadSans();
const GRID = 100;
const ZOOM = 26;
const HERO_PER = 46;
const HEROES = pick(3, 3);
const ORDER = 70;
export const CAP4_DUR = GRID + ZOOM + HEROES.length * HERO_PER + ORDER;
const GRID_PHOTOS = pick(9, 0);

const Grid: React.FC = () => {
  const f = useCurrentFrame();
  const spin = interpolate(f, [30, 60], [180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const spinBlur = interpolate(f, [30, 60], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleO = interpolate(f, [46, 60, GRID - 10, GRID], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0f", justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 340px)", gridTemplateRows: "repeat(3, 340px)", gap: 14 }}>
        {GRID_PHOTOS.map((p, i) => {
          const o = interpolate(f, [i * 4, i * 4 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const s = interpolate(f, [i * 4, i * 4 + 12], [1.18, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
          const center = i === 4;
          return (
            <div key={i} style={{ width: 340, height: 340, borderRadius: 14, overflow: "hidden", boxShadow: "0 14px 40px rgba(0,0,0,0.55)", opacity: o, transform: "scale(" + s + ") rotate(" + (i % 2 === 0 ? -0.6 : 0.6) + "deg)" + (center ? " rotate(" + spin + "deg)" : ""), filter: center ? "blur(" + spinBlur + "px)" : "none" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", textAlign: "center", opacity: titleO }}>
        <div style={{ color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 130, letterSpacing: 14, textShadow: "0 6px 40px rgba(0,0,0,0.9)" }}>FOOD</div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontFamily: sans, fontWeight: 300, fontSize: 44, letterSpacing: 26, marginTop: 4 }}>promotion</div>
      </div>
    </AbsoluteFill>
  );
};

const Hero: React.FC<{ src: string; caption: string; last: boolean }> = ({ src, caption, last }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const z = interpolate(f, [0, HERO_PER + (last ? ORDER : 0)], [1.08, 1.0]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0f", opacity: o }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + z + ")" }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)" }} />
      {!last && (
        <div style={{ position: "absolute", bottom: 130, width: "100%", textAlign: "center", color: "#fff", fontFamily: sans, fontWeight: 700, fontSize: 40, letterSpacing: 4, textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>{caption}</div>
      )}
    </AbsoluteFill>
  );
};

export const CapPromo: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  // グリッド→1枚へのズームつなぎ
  const zoomS = interpolate(f, [GRID, GRID + ZOOM], [1, 3.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const zoomO = interpolate(f, [GRID + ZOOM - 6, GRID + ZOOM], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const orderStart = GRID + ZOOM + HEROES.length * HERO_PER;
  const orderO = interpolate(f, [orderStart - ORDER * 0 + 0, orderStart + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const orderS = interpolate(f, [orderStart, orderStart + 16], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
  const endO = interpolate(f, [CAP4_DUR - 10, CAP4_DUR], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0f", opacity: endO }}>
      <Audio src={staticFile(capUptempo)} volume={(v) => interpolate(v, [0, 15, CAP4_DUR - 20, CAP4_DUR], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      {f < GRID + ZOOM && (
        <AbsoluteFill style={{ transform: "scale(" + zoomS + ")", opacity: zoomO }}>
          <Cine dark><Grid /></Cine>
        </AbsoluteFill>
      )}
      {f >= GRID + ZOOM - 2 && f < GRID + ZOOM + 10 && <Flash local={f - (GRID + ZOOM) + 2} peak={0.7} />}
      {HEROES.map((p, i) => (
        <Sequence key={i} from={GRID + ZOOM + i * HERO_PER} durationInFrames={i === HEROES.length - 1 ? HERO_PER + ORDER : HERO_PER}>
          <Cine dark><Hero src={p.src} caption={p.caption} last={i === HEROES.length - 1} /></Cine>
        </Sequence>
      ))}
      {f >= orderStart && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: orderO }}>
          <div style={{ textAlign: "center", transform: "scale(" + orderS + ")" }}>
            <div style={{ color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 110, letterSpacing: interpolate(f, [orderStart, orderStart + 24], [34, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 10px 50px rgba(0,0,0,0.8)" }}>ORDER NOW</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontFamily: sans, fontWeight: 400, fontSize: 36, letterSpacing: 6, marginTop: 20 }}>{handle}</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
