// 大衆・額装（画像投稿）＝店先の「貼り紙チラシ」1枚もの。
// 夜の灯り系はかっこよく見えるためやめて、レトロ印刷チラシ（生成り紙×朱の
// 放射バースト×網点）の上に、白フチ写真＋黄札＋爆発バッジ＋漆風朱帯で構成。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadPop } from "@remotion/google-fonts/MochiyPopOne";
import { simplePhoto, simplePhrase, simpleHasLogo, simpleW, simpleH } from "./simpleData";
import { oneLineFont } from "./fit";
import { KURO, KIIRO, SunburstBg, Halftone, Tex } from "./taishu";

const { fontFamily: pop } = loadPop();
const SHU = "#c73a28";
const SHU_DARK = "#96261a";
const KAMI = "#f0dcae";
const KIN = "#e8b64c";

// 爆発バッジ（静止画用・ギザギザ星型）
const Bakuhatsu: React.FC<{ text: string }> = ({ text }) => {
  const pts = [];
  const N = 14;
  for (let i = 0; i < N * 2; i++) {
    const r = i % 2 === 0 ? 128 : 96;
    const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(128 + Math.cos(a) * r + "," + (128 + Math.sin(a) * r));
  }
  return (
    <div style={{ position: "relative", width: 256, height: 256 }}>
      <svg width="256" height="256" viewBox="0 0 256 256" style={{ position: "absolute", filter: "drop-shadow(3px 5px 2px rgba(60,20,5,0.4))" }}>
        <polygon points={pts.join(" ")} fill={SHU} stroke={KIN} strokeWidth="5" />
        <circle cx="128" cy="102" r="72" fill="rgba(255,255,255,0.10)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: "#fff7e6", fontFamily: pop, fontSize: 40, textAlign: "center", lineHeight: 1.2,
          textShadow: "0 3px 6px rgba(80,20,5,0.5)" }}>{text}</span>
      </div>
    </div>
  );
};

export const TaishuGaku: React.FC<{ storeName?: string; handle?: string }> = ({
  storeName = "",
  handle = "@susabiyu_sanjyo",
}) => {
  const src = staticFile(simplePhoto);
  const FRAME_W = 900;
  const SAFE_H = 940;
  let dispScale = (simpleW > 0 && simpleH > 0) ? Math.min(FRAME_W / simpleW, SAFE_H / simpleH) : 0;
  if (dispScale > 1.25) dispScale = 1.25;
  const dispW = dispScale > 0 ? Math.round(simpleW * dispScale) : FRAME_W;
  const dispH = dispScale > 0 ? Math.round(simpleH * dispScale) : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: KAMI }}>
      {/* レトロ印刷の紙面 */}
      <SunburstBg speed={0} c1={SHU} c2={KAMI} />
      <Halftone opacity={0.16} color="rgba(120,45,15,0.7)" />
      <Tex opacity={0.16} blend="multiply" />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(90,35,10,0.28) 100%)" }} />

      {/* 上部：朱のリボン帯に店名 */}
      <div style={{ position: "absolute", top: 130, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "linear-gradient(180deg," + SHU + "," + SHU_DARK + ")",
          border: "3px solid " + KIN, borderRadius: 10, padding: "12px 44px", transform: "rotate(-1deg)",
          boxShadow: "0 4px 0 " + SHU_DARK + ", 0 12px 30px rgba(70,25,5,0.4)" }}>
          <span style={{ color: "#fff7e6", fontFamily: pop, fontSize: 42, letterSpacing: 2, whiteSpace: "nowrap",
            textShadow: "0 3px 6px rgba(80,20,5,0.45)" }}>{storeName || "本日のおすすめ"}</span>
        </div>
      </div>

      {/* 写真：白フチカードを傾けて貼る */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", transform: "rotate(-2deg)" }}>
          <div style={{ background: "#fdf6e6", padding: 18, borderRadius: 8,
            border: "1px solid rgba(150,80,30,0.35)",
            boxShadow: "0 10px 24px rgba(90,35,5,0.25), 0 30px 70px rgba(90,35,5,0.38)" }}>
            <Img src={src} style={{ display: "block", width: dispW, height: dispH, maxWidth: FRAME_W, maxHeight: SAFE_H, borderRadius: 4,
              filter: "saturate(1.15) contrast(1.05)" }} />
          </div>
          {/* 黄札 */}
          <div style={{ position: "absolute", top: -36, left: -30, transform: "rotate(-8deg)",
            background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "8px 22px",
            boxShadow: "5px 7px 0 rgba(0,0,0,0.3)" }}>
            <span style={{ color: SHU_DARK, fontFamily: pop, fontSize: 36, whiteSpace: "nowrap" }}>本日のオススメ</span>
          </div>
          {/* 爆発バッジ */}
          <div style={{ position: "absolute", top: -80, right: -60, transform: "rotate(10deg)" }}>
            <Bakuhatsu text={"うまい！"} />
          </div>
          {simpleHasLogo ? (
            <Img src={staticFile("logo.png")} style={{ position: "absolute", bottom: -20, right: -26, width: 110, height: "auto", objectFit: "contain",
              filter: "drop-shadow(0 6px 14px rgba(90,35,5,0.4))" }} />
          ) : null}
        </div>
      </AbsoluteFill>

      {/* フレーズ：破線枠の白バナー（チラシの締め） */}
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: "#fdf6e6", border: "4px dashed " + SHU, borderRadius: 12,
          padding: "18px 46px", transform: "rotate(-1deg)", boxShadow: "0 10px 26px rgba(90,35,5,0.3)" }}>
          <span style={{ color: SHU_DARK, fontFamily: pop, fontSize: oneLineFont(simplePhrase, 860, 50, 2, 26), letterSpacing: 1, whiteSpace: "nowrap" }}>
            {simplePhrase}
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 158, width: "100%", textAlign: "center" }}>
        <span style={{ color: KURO, fontFamily: pop, fontSize: 30, letterSpacing: 1 }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
