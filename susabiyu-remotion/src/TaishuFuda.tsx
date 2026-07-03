// 大衆①「値札チラシ風」＝スーパーのチラシの世界観。
// 黄×赤の放射バーストが回る背景に、白フチ写真カード＋爆発フキダシ＋破線バナー。
// フォントはポップ体（Mochiy Pop One）。他テンプレとは配色も文字も別物にする。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadPop } from "@remotion/google-fonts/MochiyPopOne";
import { Cine, punch, Flash } from "./cine";
import { AKA, AKA_DARK, KIIRO, SHIRO, KURO, SunburstBg, tpick, taishuMusic } from "./taishu";

const { fontFamily: pop } = loadPop();
const INTRO = 42;
const PER = 26;
const PHOTOS = tpick(6);
const OUTRO = 45;
export const TFUDA_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const KOE = ["うまい！", "アツアツ！", "自慢の一品", "キンキン！", "揚げたて！", "名物！"];

// 爆発フキダシ（ギザギザの星型バッジ）
const Bakuhatsu: React.FC<{ text: string; x: number; y: number; local: number; deg?: number }> = ({ text, x, y, local, deg = -10 }) => {
  const s = interpolate(local, [0, 6], [2.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  const o = interpolate(local, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pts = [];
  const N = 14;
  for (let i = 0; i < N * 2; i++) {
    const r = i % 2 === 0 ? 150 : 108;
    const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(150 + Math.cos(a) * r + "," + (150 + Math.sin(a) * r));
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 300, height: 300, transform: "rotate(" + deg + "deg) scale(" + s + ")", opacity: o }}>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: "absolute", filter: "drop-shadow(4px 6px 0 rgba(0,0,0,0.3))" }}>
        <polygon points={pts.join(" ")} fill={AKA} stroke={SHIRO} strokeWidth="7" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: SHIRO, fontFamily: pop, fontSize: 44, textAlign: "center", lineHeight: 1.2 }}>{text}</span>
      </div>
    </div>
  );
};

const Dish: React.FC<{ src: string; caption: string; i: number }> = ({ src, caption, i }) => {
  const f = useCurrentFrame();
  const inS = interpolate(f, [0, 7], [0.6, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) }) * punch(f, 0.04);
  const o = interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <SunburstBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
        <div style={{ transform: "scale(" + inS + ") rotate(" + (i % 2 === 0 ? -2 : 2) + "deg)" }}>
          <div style={{ width: 840, height: 1040, background: "#fff", padding: 20, borderRadius: 24, boxShadow: "0 24px 60px rgba(120,40,0,0.35)" }}>
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
          </div>
        </div>
      </AbsoluteFill>
      <Bakuhatsu text={KOE[i % KOE.length]} x={i % 2 === 0 ? 30 : 750} y={160} local={f - 4} deg={i % 2 === 0 ? -12 : 10} />
      {/* チラシ風の破線バナー */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 170, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#fff", border: "4px dashed " + AKA, borderRadius: 12, padding: "14px 42px", transform: "rotate(-1deg)", boxShadow: "0 8px 22px rgba(120,40,0,0.3)" }}>
          <span style={{ color: AKA_DARK, fontFamily: pop, fontSize: 50, whiteSpace: "nowrap" }}>{caption}</span>
        </div>
      </div>
      <Flash local={f} peak={0.22} />
    </AbsoluteFill>
  );
};

export const TaishuFuda: React.FC<{ storeName?: string; handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const outStart = INTRO + PHOTOS.length * PER;
  const iS = interpolate(f, [3, 11], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
  const iO = interpolate(f, [3, 7, INTRO - 5, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oS = interpolate(f, [outStart + 3, outStart + 11], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
  const oO = interpolate(f, [outStart, outStart + 6, TFUDA_DUR - 8, TFUDA_DUR], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: KIIRO }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TFUDA_DUR - 18, TFUDA_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.08) saturate(1.25) brightness(1.04)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <SunburstBg speed={0.3} />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ")", textAlign: "center" }}>
                <div style={{ background: AKA, borderRadius: "50%", width: 640, height: 640, boxShadow: "0 20px 60px rgba(120,20,0,0.4)",
                  display: "flex", justifyContent: "center", alignItems: "center", border: "10px solid #fff" }}>
                  <div style={{ color: "#fff", fontFamily: pop, fontSize: 96, lineHeight: 1.3 }}>本日の<br />おすすめ</div>
                </div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
        {PHOTOS.map((p, i) => (
          <Sequence key={i} from={INTRO + i * PER} durationInFrames={PER}>
            <Dish src={p.src} caption={p.caption} i={i} />
          </Sequence>
        ))}
        <Sequence from={outStart} durationInFrames={OUTRO}>
          <AbsoluteFill>
            <SunburstBg speed={0.3} />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center", background: "#fff", border: "6px dashed " + AKA, borderRadius: 20, padding: "50px 70px" }}>
                <div style={{ color: AKA_DARK, fontFamily: pop, fontSize: 84, lineHeight: 1.35 }}>毎日元気に<br />営業中！</div>
                <div style={{ color: KURO, fontFamily: pop, fontSize: 36, marginTop: 24 }}>{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
