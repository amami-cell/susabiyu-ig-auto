// 大衆・本日の一皿：烏丸「店主おすすめ」(OsusumeStory)の構成（一品全体→じわズーム＋スタンプ）
// そのままに、明朝×金 → 朱帯×太筆×赤ハンコの大衆トーンへ。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadFude } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as loadGoshi } from "@remotion/google-fonts/RocknRollOne";
import { typoPhotos, typoHeadline, typoMusic } from "./typoData";
import { oneLineFont } from "./fit";
import { AKA, KIIRO, KURO, SHIRO, fuchi } from "./taishu";
import { Flash } from "./cine";

const { fontFamily: fude } = loadFude();
const { fontFamily: goshi } = loadGoshi();
export const THITO_DUR = 240;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const STAMP_AT = 46;

export const TaishuHitosara: React.FC<{ storeName?: string; handle?: string }> = ({ storeName = "すさび湯三条", handle = "@susabiyu_sanjyo" }) => {
  const f = useCurrentFrame();
  const DUR = THITO_DUR;
  const hero = typoPhotos[0] || { src: "", caption: "" };
  const imgO = interpolate(f, [0, 14], [0, 1], clamp);
  const zoom = interpolate(f, [0, DUR], [1.0, 1.18], clamp);
  const bgScale = interpolate(f, [0, DUR], [1.14, 1.3], clamp);
  const bandY = interpolate(f, [10, 24], [-120, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const bandO = interpolate(f, [10, 22], [0, 1], clamp);
  const nameO = interpolate(f, [30, 44], [0, 1], clamp);
  const nameY = interpolate(f, [30, 46], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  // ハンコ：大→小でドン
  const st = f - STAMP_AT;
  const stS = interpolate(st, [0, 6], [3.0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const stO = st < 0 ? 0 : 1;
  const headO = interpolate(f, [58, 72], [0, 1], clamp);
  const footO = interpolate(f, [DUR - 40, DUR - 26], [0, 1], clamp);
  const nm = oneLineFont(hero.caption, 760, 64, 2, 38);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a0c06" }}>
      <Audio src={staticFile(typoMusic)} volume={(ff) => interpolate(ff, [0, 14, DUR - 20, DUR], [0, 0.85, 0.85, 0], clamp)} />
      {/* 背景：同じ写真を暖色ボカシで敷く */}
      <AbsoluteFill style={{ opacity: imgO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + bgScale + ")", filter: "blur(28px) brightness(0.55) saturate(1.35)" }} />
      </AbsoluteFill>
      {/* 前面：料理全体を切らずに表示 → じわズーム */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: imgO }}>
        <Img src={staticFile(hero.src)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(" + zoom + ")", filter: "saturate(1.12) contrast(1.04)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(26,12,6,0.48) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 52%, rgba(26,12,6,0.85) 100%)" }} />

      {/* 上の朱帯 */}
      <div style={{ position: "absolute", top: 130, left: 0, width: "100%", display: "flex", justifyContent: "center", opacity: bandO, transform: "translateY(" + bandY + "px)" }}>
        <div style={{ background: AKA, border: "5px solid " + SHIRO, color: SHIRO, fontFamily: fude, fontSize: 52, letterSpacing: 6,
          padding: "14px 44px", borderRadius: 8, transform: "rotate(-1.5deg)", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>本日の一皿</div>
      </div>

      {/* 店主おすすめ 赤ハンコ（ドン！） */}
      <div style={{ position: "absolute", top: 300, right: 60, transform: "rotate(-12deg) scale(" + stS + ")", opacity: stO }}>
        <div style={{ width: 260, height: 260, borderRadius: "50%", border: "10px solid " + AKA, display: "flex", justifyContent: "center", alignItems: "center",
          background: "rgba(250,244,230,0.92)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
          <span style={{ color: AKA, fontFamily: fude, fontSize: 54, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap" }}>店主の<br />おすすめ</span>
        </div>
      </div>
      {st >= 0 && <Flash local={st} peak={0.3} />}

      {/* 料理名（朱…ではなく黄札で差をつける）＋ひとこと */}
      <div style={{ position: "absolute", bottom: 245, left: 0, right: 0, textAlign: "center", opacity: nameO, transform: "translateY(" + nameY + "px)", padding: "0 40px" }}>
        <div style={{ display: "inline-block", background: KIIRO, border: "5px solid " + KURO, borderRadius: 10, padding: "14px 40px",
          transform: "rotate(-1.5deg)", boxShadow: "5px 7px 0 rgba(0,0,0,0.35)" }}>
          <span style={{ color: "#a31226", fontFamily: fude, fontSize: nm, letterSpacing: 2, whiteSpace: "nowrap" }}>{hero.caption}</span>
        </div>
        <div style={{ marginTop: 18, color: SHIRO, fontFamily: goshi, fontWeight: 800, fontSize: 32, letterSpacing: 1, opacity: headO, ...fuchi(KURO, 4) }}>{typoHeadline}</div>
      </div>

      {/* 屋号 */}
      <div style={{ position: "absolute", bottom: 115, left: 0, width: "100%", textAlign: "center", opacity: footO }}>
        <span style={{ color: SHIRO, fontFamily: goshi, fontSize: 28, letterSpacing: 2, ...fuchi(KURO, 4) }}>{storeName}　{handle}</span>
      </div>
    </AbsoluteFill>
  );
};
