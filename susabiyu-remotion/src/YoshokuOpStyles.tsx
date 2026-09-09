// OP/CLOSE の「見せ方」の提案集（案4〜案8）。
// 案1〜3は“地（背景）”だけを替えたものでしたが、こちらは構図とモーションそのものを変えた別案です。
// どれもブランドの語彙（丸ロゴ・テラコッタ・明朝＋Cormorant・ゆっくりした動き）は崩さず、
// 「開き方／閉じ方」の性格だけを変えています。選ばれた1案を10本すべてに適用します。
//
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。各Sequence内で相対フレーム。
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart, typoGroup } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, EASE, fade, Grain, BrandMark, StoreLogo, StoreLogoColor, StoryBgLayer,
  STORY_OPEN, STORY_END, STORY_XF,
} from "./yoshokuDesign";

type SP = { storeName?: string; handle?: string; theme?: string; openText?: string };
const DEF = { storeName: "ナガグツ", handle: "@nagagutsu0427", theme: "italian" };

// CLOSE の締め文（全案共通）。ロゴの下に置く。
const CloseCopy: React.FC<{ storeName: string; handle: string; ink: string; accent: string; f: number; start: number }> =
  ({ storeName, handle, ink, accent, f, start }) => {
    const o = fade(f, start, 30);
    const y = interpolate(f, [start, start + 40], [26, 0], { ...clamp, easing: EASE });
    return (
      <div style={{ textAlign: "center", opacity: o, transform: "translateY(" + y + "px)" }}>
        <div style={{ fontFamily: mincho, color: ink, fontSize: 56, fontWeight: 700, letterSpacing: 3, textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>ご来店をお待ちしています</div>
        <div style={{ marginTop: 14, fontFamily: serif, color: accent, fontSize: 34, letterSpacing: 6 }}>{storeName}　{handle}</div>
      </div>
    );
  };

// ── 案4：シネマの幕（上下の幕が開く／閉じる）─────────────────────────
// 「これから始まる」を最も分かりやすく伝える型。閉じる時は幕が中央へ寄って締める。
const Curtain: React.FC<{ y: number; pos: "top" | "bottom"; accent: string }> = ({ y, pos, accent }) => (
  <div style={{
    position: "absolute", left: 0, right: 0, height: 960,
    [pos]: 0, transform: "translateY(" + y + "px)",
    background: pos === "top"
      ? "linear-gradient(180deg, #1B1814 0%, #242019 100%)"
      : "linear-gradient(0deg, #1B1814 0%, #242019 100%)",
    boxShadow: "0 0 60px rgba(0,0,0,0.6)",
  }}>
    <div style={{ position: "absolute", left: 0, right: 0, [pos === "top" ? "bottom" : "top"]: 0, height: 3, background: accent, opacity: 0.85 }} />
  </div>
);

const Open4: React.FC<SP> = ({ storeName = DEF.storeName, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const open = interpolate(f, [6, 62], [0, 960], { ...clamp, easing: EASE });
  const o = Math.min(fade(f, 20, 30), interpolate(f, [STORY_OPEN - 20, STORY_OPEN], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <StoryBgLayer bg="mortar" theme={theme} dur={STORY_OPEN} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, opacity: o }}>
        <BrandMark storeName={storeName} ink={T.ink} size={300} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 40, letterSpacing: 14, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</div>
      </AbsoluteFill>
      <Curtain y={-open} pos="top" accent={T.accent} />
      <Curtain y={open} pos="bottom" accent={T.accent} />
    </AbsoluteFill>
  );
};

const End4: React.FC<SP> = ({ storeName = DEF.storeName, handle = DEF.handle, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE });
  // 幕が中央へ寄って“締める”。中央に640pxのバンドを残し、そこにロゴと締め文を置く。
  const close = interpolate(f, [STORY_XF, STORY_XF + 56], [960, 320], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, opacity: rootO }}>
      <StoryBgLayer bg="mortar" theme={theme} dur={STORY_END + STORY_XF} />
      <Curtain y={-close} pos="top" accent={T.accent} />
      <Curtain y={close} pos="bottom" accent={T.accent} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18 }}>
        {/* 案4のCLOSEだけ丸ロゴではなく“文字ロゴ”で締める（暗い幕の上なので生成り版） */}
        <div style={{ opacity: fade(f, STORY_XF + 22, 30) }}><StoreLogo storeName={storeName} height={124} /></div>
        <CloseCopy storeName={storeName} handle={handle} ink={T.ink} accent={T.accent} f={f} start={STORY_XF + 34} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 案5：写真から引く（ゆっくり引いてロゴが重なる）───────────────────
// Driveの「集合」フォルダに写真があればスタッフ集合写真で始まり、無ければ料理写真。
// 「どんな人がやっている店か」を最初の1秒で伝えられるのが集合写真版の強み。
const Open5: React.FC<SP> = ({ storeName = DEF.storeName, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  // Driveの「集合」フォルダに写真があれば“お店の人”から始める（無ければ料理写真）。
  const src = typoGroup || (typoPhotos[0] && typoPhotos[0].src) || "";
  const s = interpolate(f, [0, STORY_OPEN], [1.42, 1.06], { ...clamp, easing: EASE });
  const scrim = interpolate(f, [0, STORY_OPEN], [0.2, 0.62], clamp);
  const o = Math.min(fade(f, 28, 30), interpolate(f, [STORY_OPEN - 18, STORY_OPEN], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      {src ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + s + ")", filter: "saturate(1.1) contrast(1.05)" }} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ background: "rgba(8,5,3," + scrim + ")" }} />
      <AbsoluteFill style={{ background: "radial-gradient(70% 46% at 50% 46%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 66%, rgba(0,0,0,0.66) 100%)" }} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, opacity: o }}>
        <BrandMark storeName={storeName} ink={T.ink} size={300} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 40, letterSpacing: 14, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</div>
      </AbsoluteFill>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

const End5: React.FC<SP> = ({ storeName = DEF.storeName, handle = DEF.handle, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE });
  const src = typoGroup || (typoPhotos[0] && typoPhotos[0].src) || "";
  // 写真がゆっくりボケていき、ロゴだけが残る＝余韻。
  const b = interpolate(f, [STORY_XF, STORY_XF + 62], [6, 40], { ...clamp, easing: EASE });
  const s = interpolate(f, [0, STORY_END + STORY_XF], [1.08, 1.16], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, opacity: rootO }}>
      {src ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + s + ")", filter: "blur(" + b + "px) brightness(0.44) saturate(1.15)" }} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(70% 46% at 50% 46%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 66%, rgba(0,0,0,0.78) 100%)" }} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18 }}>
        <div style={{ opacity: fade(f, STORY_XF + 10, 26) }}><BrandMark storeName={storeName} ink={T.ink} size={220} /></div>
        <CloseCopy storeName={storeName} handle={handle} ink={T.ink} accent={T.accent} f={f} start={STORY_XF + 20} />
      </AbsoluteFill>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

// ── 案6：ネオンが灯る（看板に灯が入る）──────────────────────────
// 夜の肉バルらしい型。明滅は1回だけに抑えて“安っぽい点滅”にしない。
const Open6: React.FC<SP> = ({ storeName = DEF.storeName, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  // 灯りが入る瞬間の1回だけのゆらぎ→そのあと安定。
  const lit = interpolate(f, [0, 8, 11, 15, 18, 32, STORY_OPEN - 14, STORY_OPEN], [0, 0.55, 0.12, 0.85, 0.3, 1, 1, 0.9], clamp);
  const glow = 10 + lit * 40;
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <StoryBgLayer bg="mortar" theme={theme} dur={STORY_OPEN} />
      {/* 看板の光が壁に回り込む */}
      <AbsoluteFill style={{ background: "radial-gradient(46% 30% at 50% 46%, " + T.accent + "33 0%, transparent 72%)", opacity: lit }} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 22 }}>
        <div style={{ opacity: lit, filter: "drop-shadow(0 0 " + glow + "px " + T.accent + "cc)" }}>
          <BrandMark storeName={storeName} ink={T.ink} size={300} />
        </div>
        <div style={{
          fontFamily: serif, color: T.accent, fontSize: 40, letterSpacing: 14, textTransform: "uppercase", fontWeight: 600,
          opacity: lit, textShadow: "0 0 " + (glow * 0.6) + "px " + T.accent + "aa",
        }}>{T.label}</div>
      </AbsoluteFill>
      <Grain opacity={0.09} />
    </AbsoluteFill>
  );
};

const End6: React.FC<SP> = ({ storeName = DEF.storeName, handle = DEF.handle, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE });
  const lit = fade(f, STORY_XF, 32);
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, opacity: rootO }}>
      <StoryBgLayer bg="mortar" theme={theme} dur={STORY_END + STORY_XF} />
      <AbsoluteFill style={{ background: "radial-gradient(46% 30% at 50% 40%, " + T.accent + "2e 0%, transparent 72%)", opacity: lit }} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18 }}>
        <div style={{ opacity: lit, filter: "drop-shadow(0 0 34px " + T.accent + "aa)" }}>
          <BrandMark storeName={storeName} ink={T.ink} size={220} />
        </div>
        <CloseCopy storeName={storeName} handle={handle} ink={T.ink} accent={T.accent} f={f} start={STORY_XF + 16} />
      </AbsoluteFill>
      <Grain opacity={0.09} />
    </AbsoluteFill>
  );
};

// ── 案7：金の円環が一周描かれる ────────────────────────────────
// 静かで上品な型。線が一周した瞬間にロゴが定まる＝“印を押した”ような締まり。
const Ring: React.FC<{ f: number; start: number; dur: number; color: string; r?: number; w?: number }> =
  ({ f, start, dur, color, r = 216, w = 3 }) => {
    const C = 2 * Math.PI * r;
    const off = interpolate(f, [start, start + dur], [C, 0], { ...clamp, easing: EASE });
    return (
      <svg width={r * 2 + 40} height={r * 2 + 40} style={{ position: "absolute" }}>
        <circle cx={r + 20} cy={r + 20} r={r} fill="none" stroke={color} strokeWidth={w}
          strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
          transform={"rotate(-90 " + (r + 20) + " " + (r + 20) + ")"} />
      </svg>
    );
  };

const Open7: React.FC<SP> = ({ storeName = DEF.storeName, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const o = Math.min(fade(f, 22, 30), interpolate(f, [STORY_OPEN - 18, STORY_OPEN], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <StoryBgLayer bg="wine" theme={theme} dur={STORY_OPEN} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ring f={f} start={6} dur={64} color={T.accent} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: o }}>
          <BrandMark storeName={storeName} ink={T.ink} size={250} />
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 470, textAlign: "center", opacity: fade(f, 26, 22) }}>
        <span style={{ fontFamily: serif, color: T.accent, fontSize: 38, letterSpacing: 14, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</span>
      </div>
    </AbsoluteFill>
  );
};

const End7: React.FC<SP> = ({ storeName = DEF.storeName, handle = DEF.handle, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, opacity: rootO }}>
      <StoryBgLayer bg="wine" theme={theme} dur={STORY_END + STORY_XF} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ring f={f} start={STORY_XF} dur={46} color={T.accent} r={172} />
        <div style={{ opacity: fade(f, STORY_XF + 12, 24) }}><BrandMark storeName={storeName} ink={T.ink} size={200} /></div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1030, display: "flex", justifyContent: "center" }}>
        <CloseCopy storeName={storeName} handle={handle} ink={T.ink} accent={T.accent} f={f} start={STORY_XF + 22} />
      </div>
    </AbsoluteFill>
  );
};

// ── 案8：タイポが左右から集まる ───────────────────────────────
// 雑誌の扉ページのような型。文字が主役なので、ロゴが小さめでもブランドが立つ。
const Open8: React.FC<SP> = ({ storeName = DEF.storeName, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const xL = interpolate(f, [0, 50], [-260, 0], { ...clamp, easing: EASE });
  const xR = interpolate(f, [8, 58], [260, 0], { ...clamp, easing: EASE });
  const rule = interpolate(f, [20, 66], [0, 520], { ...clamp, easing: EASE });
  const o = Math.min(fade(f, 6, 28), interpolate(f, [STORY_OPEN - 18, STORY_OPEN], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ backgroundColor: T.base }}>
      <StoryBgLayer bg="mortar" theme={theme} dur={STORY_OPEN} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, opacity: o }}>
        <div style={{ opacity: fade(f, 20, 26) }}><BrandMark storeName={storeName} ink={T.ink} size={230} /></div>
        <div style={{ width: rule, height: 2, background: T.accent, opacity: 0.9 }} />
        <div style={{ display: "flex", gap: 26, alignItems: "baseline" }}>
          <span style={{ fontFamily: serif, color: T.ink, fontSize: 42, letterSpacing: 12, textTransform: "uppercase", fontWeight: 600, transform: "translateX(" + xL + "px)" }}>{T.label}</span>
          <span style={{ fontFamily: mincho, color: T.accent, fontSize: 38, letterSpacing: 8, fontWeight: 700, transform: "translateX(" + xR + "px)" }}>本日のおすすめ</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const End8: React.FC<SP> = ({ storeName = DEF.storeName, handle = DEF.handle, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE });
  const rule = interpolate(f, [STORY_XF, STORY_XF + 34], [0, 520], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: T.base, opacity: rootO }}>
      <StoryBgLayer bg="mortar" theme={theme} dur={STORY_END + STORY_XF} />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18 }}>
        <div style={{ opacity: fade(f, STORY_XF + 8, 26) }}><BrandMark storeName={storeName} ink={T.ink} size={210} /></div>
        <div style={{ width: rule, height: 2, background: T.accent, opacity: 0.9 }} />
        <CloseCopy storeName={storeName} handle={handle} ink={T.ink} accent={T.accent} f={f} start={STORY_XF + 18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


// ── 案9：雑誌の表紙／裏表紙 ────────────────────────────────
// OPは「今月号の表紙」。料理を全面に敷き、上に誌名（＝店ロゴ）、下に見出し。
// CLOSEは「裏表紙（奥付）」。クリームの紙面に丸ロゴと締め文を静かに置く。
const MAG_CREAM = "#F3E7CF";
const MAG_CREAM_D = "#E7D5B2";
const MAG_INK = "#241A12";

function _todayMD(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
  return now.getUTCMonth() + 1 + "/" + now.getUTCDate();
}

const Open9: React.FC<SP> = ({ storeName = DEF.storeName, theme = DEF.theme, openText = "" }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const head = interpolate(f, [0, 44], [-36, 0], { ...clamp, easing: EASE });   // 誌名が上から入る
  const rule = interpolate(f, [12, 60], [0, 620], { ...clamp, easing: EASE });  // 誌名下の罫が引かれる
  const cover = interpolate(f, [22, 68], [30, 0], { ...clamp, easing: EASE });  // 見出しが下から
  const o = Math.min(fade(f, 2, 24), interpolate(f, [STORY_OPEN - 16, STORY_OPEN], [1, 0], clamp));
  // 営業時間はスプレッドシート(入力用)が正。未登録なら嘘の時刻を出さず中立表示にする。
  const hours = (openText || "").trim();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 30%, " + MAG_CREAM + " 0%, " + MAG_CREAM_D + " 100%)", opacity: o }}>
      {/* 紙の織り目＋誌面の二重罫（CLOSEの裏表紙とまったく同じ作法＝表紙と裏表紙で対になる） */}
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      <div style={{ position: "absolute", inset: 44, border: "2px solid rgba(150,110,70,0.4)" }} />
      <div style={{ position: "absolute", inset: 60, border: "1px solid rgba(150,110,70,0.26)" }} />

      {/* 誌名（＝店ロゴ）。写真は載せず、文字と罫だけの誌面にする。 */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", transform: "translateY(" + head + "px)" }}>
        <StoreLogoColor storeName={storeName} height={196} />
      </div>
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: rule, height: 2, background: T.slab, opacity: 0.75 }} />
      </div>
      <div style={{ position: "absolute", top: 584, left: 0, right: 0, textAlign: "center", opacity: fade(f, 20, 22) }}>
        <span style={{ fontFamily: serif, color: T.slab, fontSize: 26, letterSpacing: 10, textTransform: "uppercase", fontWeight: 600 }}>{T.label}　·　OGGI {_todayMD()}</span>
      </div>

      {/* 見出し */}
      <div style={{ position: "absolute", left: 116, right: 116, top: 720, textAlign: "center", transform: "translateY(" + cover + "px)", opacity: fade(f, 22, 26) }}>
        <div style={{ fontFamily: mincho, color: MAG_INK, fontSize: 86, fontWeight: 700, letterSpacing: 8 }}>本日のおすすめ</div>
      </div>

      {/* 営業時間（奥付の作法で枠に収める）。未登録の間は中立の一行。 */}
      <div style={{ position: "absolute", left: 190, right: 190, top: 930, border: "1px solid rgba(150,110,70,0.45)", padding: "26px 20px 30px", textAlign: "center", opacity: fade(f, 34, 28) }}>
        <div style={{ fontFamily: serif, color: T.slab, fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>ORARIO</div>
        <div style={{ fontFamily: mincho, color: MAG_INK, fontSize: hours ? 52 : 44, fontWeight: 700, letterSpacing: 3, lineHeight: 1.3, whiteSpace: "pre-line" }}>
          {hours || "本日も、営業中。"}
        </div>
      </div>

      {/* 奥付のフッター帯（CLOSEと対） */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: T.slab, opacity: fade(f, 30, 26) }} />
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, 34, 26) }}>
        <span style={{ fontFamily: serif, color: "#FDF6EA", fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600 }}>SIGNATURE</span>
        <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 4 }}>{storeName}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

const End9: React.FC<SP> = ({ storeName = DEF.storeName, handle = DEF.handle, theme = DEF.theme }) => {
  const f = useCurrentFrame(); const T = ytheme(theme);
  const rootO = interpolate(f, [0, STORY_XF], [0, 1], { ...clamp, easing: EASE });
  const rule = interpolate(f, [STORY_XF, STORY_XF + 46], [0, 620], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 34%, " + MAG_CREAM + " 0%, " + MAG_CREAM_D + " 100%)", opacity: rootO }}>
      {/* 紙の織り目＋誌面の二重罫（裏表紙の作法） */}
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(120,80,40,0.5) 0 1px, transparent 1px 6px)" }} />
      <div style={{ position: "absolute", inset: 44, border: "2px solid rgba(150,110,70,0.4)" }} />
      <div style={{ position: "absolute", inset: 60, border: "1px solid rgba(150,110,70,0.26)" }} />

      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <div style={{ opacity: fade(f, STORY_XF + 6, 26) }}>
          <StoreLogoColor storeName={storeName} height={168} />
        </div>
        <div style={{ width: rule, height: 2, background: T.slab, opacity: 0.8 }} />
        <div style={{ textAlign: "center", opacity: fade(f, STORY_XF + 20, 28) }}>
          <div style={{ fontFamily: mincho, color: MAG_INK, fontSize: 54, fontWeight: 700, letterSpacing: 4 }}>ご来店をお待ちしています</div>
          <div style={{ marginTop: 16, fontFamily: serif, color: T.slab, fontSize: 32, letterSpacing: 6 }}>{storeName}　{handle}</div>
        </div>
      </AbsoluteFill>

      {/* 奥付のフッター帯 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: T.slab, opacity: fade(f, STORY_XF + 10, 26) }} />
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: fade(f, STORY_XF + 14, 26) }}>
        <span style={{ fontFamily: serif, color: "#FDF6EA", fontSize: 24, letterSpacing: 8, textTransform: "uppercase", fontWeight: 600 }}>{T.label}</span>
        <span style={{ fontFamily: serif, color: "rgba(253,246,234,0.9)", fontSize: 24, letterSpacing: 4 }}>{handle}</span>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ── 比較用プレビュー（OP → CLOSE をつないだ約5.3秒）─────────────────
export const YOPS_DUR = STORY_OPEN + STORY_END;

const Preview: React.FC<SP & { Open: React.FC<SP>; End: React.FC<SP> }> = ({ Open, End, ...p }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)}
      volume={(ff) => interpolate(ff, [0, 14, YOPS_DUR - 24, YOPS_DUR], [0, 0.8, 0.8, 0], clamp)} />
    <Sequence durationInFrames={STORY_OPEN}><Open {...p} /></Sequence>
    <Sequence from={STORY_OPEN - STORY_XF} durationInFrames={STORY_END + STORY_XF}><End {...p} /></Sequence>
  </AbsoluteFill>
);

export const YoshokuOp4: React.FC<SP> = (p) => <Preview Open={Open4} End={End4} {...p} />;
export const YoshokuOp5: React.FC<SP> = (p) => <Preview Open={Open5} End={End5} {...p} />;
export const YoshokuOp6: React.FC<SP> = (p) => <Preview Open={Open6} End={End6} {...p} />;
export const YoshokuOp7: React.FC<SP> = (p) => <Preview Open={Open7} End={End7} {...p} />;
export const YoshokuOp8: React.FC<SP> = (p) => <Preview Open={Open8} End={End8} {...p} />;
export const YoshokuOp9: React.FC<SP> = (p) => <Preview Open={Open9} End={End9} {...p} />;
