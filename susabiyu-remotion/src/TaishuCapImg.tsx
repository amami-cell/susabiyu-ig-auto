// 大衆・写真一言（画像投稿）＝写真全面の「ポップ貼り紙」。
// 夜のムード系はやめて、集中線＋爆発バッジ＋黄色の極太帯で店頭POPの勢いにする。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryHasLogo } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, SHIRO, Shuchusen, fuchi } from "./taishu";

const { fontFamily: goshi } = loadGoshi();
const TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];

// 爆発バッジ（赤×白フチのギザギザ）
const Bakuhatsu: React.FC<{ text: string }> = ({ text }) => {
  const pts = [];
  const N = 14;
  for (let i = 0; i < N * 2; i++) {
    const r = i % 2 === 0 ? 140 : 104;
    const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(140 + Math.cos(a) * r + "," + (140 + Math.sin(a) * r));
  }
  return (
    <div style={{ position: "relative", width: 280, height: 280 }}>
      <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: "absolute", filter: "drop-shadow(4px 6px 0 rgba(0,0,0,0.3))" }}>
        <polygon points={pts.join(" ")} fill={AKA} stroke={SHIRO} strokeWidth="7" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: SHIRO, fontFamily: goshi, fontWeight: 800, fontSize: 44, textAlign: "center", lineHeight: 1.2 }}>{text}</span>
      </div>
    </div>
  );
};

export const TaishuCapImg: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const src = staticFile(photoStoryPhoto);
  const tag = TAG[photoStoryCaption.length % TAG.length];
  return (
    <AbsoluteFill style={{ backgroundColor: KURO }}>
      {/* 写真全面（明るく・鮮やかに） */}
      <AbsoluteFill>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.02) saturate(1.2) contrast(1.05)" }} />
      </AbsoluteFill>
      {/* 集中線（うっすら白）で勢いを足す */}
      <Shuchusen color="rgba(255,255,255,0.30)" opacity={0.9} />
      {/* 上下は読みやすさのための最小限の暗がり */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)" }} />

      {/* 爆発バッジ（掛け声） */}
      <div style={{ position: "absolute", top: 120, left: 44, transform: "rotate(-10deg)" }}>
        <Bakuhatsu text={tag} />
      </div>
      {photoStoryHasLogo ? (
        <Img src={staticFile("logo.png")} style={{ position: "absolute", top: 84, right: 60, height: 110, width: "auto", objectFit: "contain", opacity: 0.95,
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }} />
      ) : null}

      {/* 品名：黄色の極太帯にドン */}
      <div style={{ position: "absolute", bottom: 300, left: 0, right: 0, textAlign: "center", padding: "0 30px" }}>
        <div style={{ display: "inline-block", background: KIIRO, border: "6px solid " + KURO, borderRadius: 14,
          padding: "20px 46px", transform: "rotate(-1.5deg)", boxShadow: "8px 10px 0 rgba(0,0,0,0.35)" }}>
          <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: oneLineFont(photoStoryCaption, 880, 62, 2, 30), letterSpacing: 1, whiteSpace: "nowrap" }}>
            {photoStoryCaption}
          </span>
        </div>
      </div>

      {/* 朱の小帯：店名ハンドル */}
      <div style={{ position: "absolute", bottom: 190, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ display: "inline-block", background: AKA, border: "4px solid " + SHIRO, borderRadius: 8,
          padding: "10px 30px", transform: "rotate(1deg)", boxShadow: "0 8px 22px rgba(0,0,0,0.45)",
          color: SHIRO, fontFamily: goshi, fontWeight: 800, fontSize: 30, letterSpacing: 1 }}>{handle}</span>
      </div>
      {/* 下端の元気ひとこと */}
      <div style={{ position: "absolute", bottom: 108, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ color: SHIRO, fontFamily: goshi, fontWeight: 800, fontSize: 34, letterSpacing: 2, ...fuchi(KURO, 5) }}>本日も元気に営業中！</span>
      </div>
    </AbsoluteFill>
  );
};
