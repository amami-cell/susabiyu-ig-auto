// 大衆①「値札チラシ風」＝昭和レトロな刷りもの（印刷ポスター）の世界観。
// 生成りの紙に朱色の放射バースト、網点＋紙のざらつきで「印刷物」の質感を出す。
// バッジは金フチの赤、帯は漆塗り風の朱×金。フォントはポップ体（Mochiy Pop One）。
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadPop } from "@remotion/google-fonts/MochiyPopOne";
import { Cine, punch, Flash } from "./cine";
import { SunburstBg, Halftone, Tex, tpick, taishuMusic } from "./taishu";

const { fontFamily: pop } = loadPop();
const INTRO = 42;
const PER = 26;
const PHOTOS = tpick(6);
const OUTRO = 45;
export const TFUDA_DUR = INTRO + PHOTOS.length * PER + OUTRO;
const KOE = ["うまい！", "アツアツ！", "自慢の一品", "キンキン！", "揚げたて！", "名物！"];
const SHU = "#c73a28";        // 朱（レトロ印刷の赤）
const SHU_DARK = "#96261a";
const KAMI = "#f0dcae";       // 生成りの紙
const KIN = "#e8b64c";        // 金
const SUMI = "#33231a";

// レトロ刷りの背景セット（バースト＋網点＋紙質感＋周辺減光）
const RetroBg: React.FC<{ speed?: number }> = ({ speed = 0.12 }) => (
  <AbsoluteFill>
    <SunburstBg speed={speed} c1={SHU} c2={KAMI} />
    <Halftone opacity={0.16} color="rgba(120,45,15,0.7)" />
    <Tex opacity={0.16} blend="multiply" />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(90,35,10,0.28) 100%)" }} />
  </AbsoluteFill>
);

// 爆発フキダシ（金フチのギザギザ星型バッジ）
const Bakuhatsu: React.FC<{ text: string; x: number; y: number; local: number; deg?: number }> = ({ text, x, y, local, deg = -10 }) => {
  const s = interpolate(local, [0, 6], [2.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  const o = interpolate(local, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pts = [];
  const N = 14;
  for (let i = 0; i < N * 2; i++) {
    const r = i % 2 === 0 ? 150 : 112;
    const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(150 + Math.cos(a) * r + "," + (150 + Math.sin(a) * r));
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 300, height: 300, transform: "rotate(" + deg + "deg) scale(" + s + ")", opacity: o }}>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: "absolute", filter: "drop-shadow(3px 6px 2px rgba(60,20,5,0.4))" }}>
        <polygon points={pts.join(" ")} fill={SHU} stroke={KIN} strokeWidth="6" />
        <circle cx="150" cy="120" r="86" fill="rgba(255,255,255,0.10)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: "#fff7e6", fontFamily: pop, fontSize: 42, textAlign: "center", lineHeight: 1.2,
          textShadow: "0 3px 6px rgba(80,20,5,0.5)" }}>{text}</span>
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
      <RetroBg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
        <div style={{ transform: "scale(" + inS + ") rotate(" + (i % 2 === 0 ? -2 : 2) + "deg)" }}>
          <div style={{ width: 840, height: 1040, background: "#fdf6e6", padding: 20, borderRadius: 8,
            border: "1px solid rgba(150,80,30,0.35)",
            boxShadow: "0 10px 24px rgba(90,35,5,0.25), 0 34px 80px rgba(90,35,5,0.38)" }}>
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
          </div>
        </div>
      </AbsoluteFill>
      <Bakuhatsu text={KOE[i % KOE.length]} x={i % 2 === 0 ? 30 : 750} y={160} local={f - 4} deg={i % 2 === 0 ? -12 : 10} />
      {/* 漆塗り風の朱×金の品名帯 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 170, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "linear-gradient(180deg," + SHU + "," + SHU_DARK + ")",
          border: "3px solid " + KIN, borderRadius: 10, padding: "16px 46px", transform: "rotate(-1deg)",
          boxShadow: "0 4px 0 " + SHU_DARK + ", 0 14px 34px rgba(70,25,5,0.45)" }}>
          <span style={{ color: "#fff7e6", fontFamily: pop, fontSize: 50, whiteSpace: "nowrap", textShadow: "0 3px 6px rgba(80,20,5,0.45)" }}>{caption}</span>
        </div>
      </div>
      <Flash local={f} peak={0.18} />
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
    <AbsoluteFill style={{ backgroundColor: KAMI }}>
      <Audio src={staticFile(taishuMusic)} volume={(v) => interpolate(v, [0, 12, TFUDA_DUR - 18, TFUDA_DUR], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Cine grade="contrast(1.06) saturate(1.12) sepia(0.08)">
        <Sequence durationInFrames={INTRO}>
          <AbsoluteFill>
            <RetroBg speed={0.3} />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: iO }}>
              <div style={{ transform: "scale(" + iS + ")", textAlign: "center" }}>
                {/* 朱の丸看板＋金の二重リング（判子・漆の趣） */}
                <div style={{ background: "radial-gradient(circle at 50% 36%, " + SHU + " 0%, " + SHU_DARK + " 85%)",
                  borderRadius: "50%", width: 640, height: 640,
                  border: "8px solid " + KIN, boxShadow: "inset 0 0 0 10px " + SHU_DARK + ", inset 0 0 0 14px " + KIN + ", 0 24px 70px rgba(80,25,5,0.45)",
                  display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ color: "#fff7e6", fontFamily: pop, fontSize: 96, lineHeight: 1.3, textShadow: "0 4px 10px rgba(70,15,0,0.5)" }}>本日の<br />おすすめ</div>
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
            <RetroBg speed={0.3} />
            <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: oO }}>
              <div style={{ transform: "scale(" + oS + ") rotate(-2deg)", textAlign: "center",
                background: "#fdf6e6", border: "3px solid " + SHU, borderRadius: 14, padding: "50px 70px",
                boxShadow: "inset 0 0 0 6px #fdf6e6, inset 0 0 0 9px " + KIN + ", 0 24px 70px rgba(80,25,5,0.4)" }}>
                <div style={{ color: SHU_DARK, fontFamily: pop, fontSize: 84, lineHeight: 1.35 }}>毎日元気に<br />営業中！</div>
                <div style={{ color: SUMI, fontFamily: pop, fontSize: 36, marginTop: 24 }}>{handle}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        </Sequence>
      </Cine>
    </AbsoluteFill>
  );
};
