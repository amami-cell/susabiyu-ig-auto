// 三条・画像投稿の正式デザイン「のれん」。
// 上部だけ紺のれん（中央に白抜きロゴ大きめ＝屋号の染め抜き風）、
// 背景は店内写真のボカシ（毎回同じ1枚）。写真は切り抜かず白フチで全体表示。
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { photoStoryPhoto, photoStoryCaption, photoStoryGenre, photoStoryBg } from "./photoStoryData";
import { oneLineFont } from "./fit";
import { AKA, AKA_DARK, KIIRO, KURO, fuchi } from "./taishu";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
const NAVY = "#1c3454";
const NAVY2 = "#142842";
const KINARI = "#f2e8d0";
export const FOOD_TAG = ["名物", "一番人気", "店主おすすめ", "イチオシ！", "本日のオススメ", "今日も旨い"];
export const ATMO_TAG = ["営業中", "今夜もにぎやか", "本日も元気", "お待ちしてます"];

// のれん画像レイアウト（額装・写真一言の共通土台）
export const NorenImgBase: React.FC<{
  photoSrc: string;
  bgSrc: string;          // 店内背景（無ければ写真自身のボカシ）
  tag: string;
  caption: string;
  handle: string;
}> = ({ photoSrc, bgSrc, tag, caption, handle }) => {
  const bg = bgSrc || photoSrc;
  return (
    <AbsoluteFill style={{ backgroundColor: "#241812" }}>
      {/* 背景＝店内写真のボカシ（1パターン固定） */}
      <AbsoluteFill>
        <Img src={staticFile(bg)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(26px) brightness(0.58) saturate(1.25)", transform: "scale(1.15)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,12,8,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 58%, rgba(20,12,8,0.85) 100%)" }} />

      {/* 写真：白木フチ・全体表示 */}
      <div style={{ position: "absolute", top: 480, left: 0, right: 0, bottom: 380, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <div style={{ overflow: "hidden", border: "8px solid " + KINARI, borderRadius: 6, transform: "rotate(-1.5deg)",
            boxShadow: "0 26px 70px rgba(0,0,0,0.6)", lineHeight: 0 }}>
            <Img src={staticFile(photoSrc)} style={{ display: "block", maxWidth: 930, maxHeight: 860, width: "auto", height: "auto",
              filter: "saturate(1.12) contrast(1.04)" }} />
          </div>
          {/* 黄札（写真の種類で言葉が変わる） */}
          <div style={{ position: "absolute", top: -36, left: -26, transform: "rotate(-8deg)",
            background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "8px 24px",
            boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
            <span style={{ color: AKA_DARK, fontFamily: goshi, fontWeight: 800, fontSize: 36, whiteSpace: "nowrap" }}>{tag}</span>
          </div>
        </div>
      </div>

      {/* 上部の紺のれん（3枚・中央に白抜きロゴ大きめ） */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 400 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", top: 0, left: "calc(" + (i * 33.34) + "% + " + (i * 4) + "px)",
            width: "calc(33.34% - 6px)", height: "100%",
            background: "linear-gradient(180deg," + NAVY + " 0%," + NAVY2 + " 100%)",
            borderRight: i < 2 ? "2px solid rgba(0,0,0,0.35)" : "none",
            boxShadow: "inset 0 -26px 40px rgba(0,0,0,0.28)" }} />
        ))}
        {/* のれんの影 */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -26, height: 26, background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0))" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Img src={staticFile("storelogo_white.png")} style={{ width: 620, height: "auto", maxHeight: 330, objectFit: "contain",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.45))" }} />
        </div>
      </div>

      {/* 品名フレーズ：朱帯＋太筆 */}
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, textAlign: "center", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: AKA, border: "5px solid " + KINARI, borderRadius: 8,
          padding: "16px 44px", transform: "rotate(-1.5deg)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#fff6e8", fontFamily: fude, fontSize: oneLineFont(caption, 860, 56, 2, 28), letterSpacing: 2, whiteSpace: "nowrap" }}>{caption}</span>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 158, width: "100%", textAlign: "center", color: KINARI, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>
        {handle}
      </div>
    </AbsoluteFill>
  );
};

// 写真一言（画像）＝ランダム写真＋整合キャプション
export const TaishuCapNoren: React.FC<{ handle?: string }> = ({ handle = "@susabiyu_sanjyo" }) => {
  const pool = photoStoryGenre === "atmo" ? ATMO_TAG : FOOD_TAG;
  const tag = pool[photoStoryCaption.length % pool.length];
  return <NorenImgBase photoSrc={photoStoryPhoto} bgSrc={photoStoryBg} tag={tag} caption={photoStoryCaption} handle={handle} />;
};
