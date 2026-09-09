// 洋食⑧タッチパネル：すさび湯三条のタッチパネル注文風。4品をゆっくりボードに並べ→1品をタップ→
// 選んだ1品を大きくアップにして紹介する。役割＝“選ぶ楽しさ＝本日のおすすめ”を体験として見せる。
// アニメは useCurrentFrame/interpolate のみ（CSSトランジション禁止）。
import { AbsoluteFill, Img, Audio, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { typoPhotos, typoMusic, typoMusicStart } from "./typoData";
import { ytheme } from "./yoshokuTheme";
import {
  mincho, serif, clamp, SAFE, EASE, fade,
  Grain, Vignette, SampleBadge, StoreLogo, splitLines, heroSize, fitOneLine,
} from "./yoshokuDesign";

// ロゴが出てからの余韻を2秒(60f)伸ばした尺。ロゴの登場位置は POLA_LOGO_IN で固定するので、
// 尺を変えてもロゴは同じタイミングで出て、そのあとの余韻だけが長くなる。
export const YPOLA_DUR = 390; // 13s
const POLA_LOGO_IN = 274;     // ロゴ＋ハンドルが立ち上がるフレーム（従来の 330-56 と同じ位置）

// 演出の区切り（フレーム）
const PLACE0 = 26;   // 1枚目を置き始める
const STEP = 26;     // 1枚ずつ“ゆっくり”置く間隔
const TAP = 168;     // タップ開始
const ZOOM = 202;    // 選んだ1品をアップに

export const YoshokuPola: React.FC<{ storeName?: string; handle?: string; theme?: string }> = ({
  storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => {
  const f = useCurrentFrame();
  const DUR = YPOLA_DUR;
  const T = ytheme(theme);
  const p0 = typoPhotos[0] || { src: "", caption: "", story: "", sub: "", disp: "", desc: "" };
  const cards = [p0, typoPhotos[1] || p0, typoPhotos[2] || p0, typoPhotos[3] || p0];
  const pick = 0; // タップ→アップにする1品（先頭＝本日の主役）

  // 2x2タイル（タッチパネルのメニューボタン）。中心からのオフセット。
  const TW = 436, PH = 344, LH = 94; // タイル幅・写真高・ラベル帯高
  const pos = [
    { x: -232, y: -232 }, { x: 232, y: -232 },
    { x: -232, y: 232 }, { x: 232, y: 232 },
  ];

  // グリッド全体のフェード（ズームで退場）
  const gridO = interpolate(f, [ZOOM, ZOOM + 20], [1, 0], clamp);
  // タップ演出（リング＋指先）
  const ringO = interpolate(f, [TAP, TAP + 6, TAP + 30], [0, 0.9, 0], clamp);
  const ringS = interpolate(f, [TAP, TAP + 30], [0.2, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const fingerO = interpolate(f, [TAP - 10, TAP, ZOOM - 6, ZOOM], [0, 1, 1, 0], clamp);
  const fingerDip = interpolate(f, [TAP, TAP + 8, TAP + 18], [0, 10, 0], clamp);

  // 選んだ品
  const sel = cards[pick];
  const selNm = (sel.disp && sel.disp.length) ? sel.disp : sel.caption;
  const selOne = (selNm || "").replace(/[｜\n]/g, "");        // アップ紹介の料理名は必ず1行
  const selSz = fitOneLine(selOne, 84, 1000, 34);
  const featO = interpolate(f, [ZOOM + 8, ZOOM + 28], [0, 1], clamp);
  const featS = interpolate(f, [ZOOM + 8, ZOOM + 34], [0.9, 1], { ...clamp, easing: EASE });
  const featTxtO = interpolate(f, [ZOOM + 26, ZOOM + 44], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ fontFamily: mincho }}>
      <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)} volume={(ff) => interpolate(ff, [0, 16, DUR - 24, DUR], [0, 0.8, 0.8, 0], clamp)} />

      {/* 背景：温かい卓上（タッチパネルの筐体）＋地紋。真っ黒を避ける。 */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 40%, #3c2e22 0%, #2a2016 52%, #1c150e 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.05, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,240,220,0.5) 0 1px, transparent 1px 30px)" }} />
      <Grain opacity={0.09} />
      <Vignette strength={0.5} />

      {/* 右上：見本番号（本番投稿では非表示） */}
      <SampleBadge accent={T.accent} f={f} />

      {/* 上：MEAT BAR（大きく）＋本日のおすすめ */}
      <div style={{ position: "absolute", top: SAFE.top - 70, left: SAFE.side, right: SAFE.side, textAlign: "center", opacity: fade(f, 6) }}>
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 62, letterSpacing: 14, fontWeight: 600, textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>{T.label}</div>
        <div style={{ marginTop: 10, fontFamily: mincho, color: "#F1E7D6", fontSize: 52, fontWeight: 700, letterSpacing: 8, textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>本日のおすすめ</div>
      </div>

      {/* タッチパネルのタイル4枚（ゆっくり1枚ずつ設置）＋タップ演出＋選んだ1品のアップ */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", transform: "translateY(52px)" }}>
          {/* 4タイル */}
          {gridO > 0.001 ? pos.map((L, i) => {
            const start = PLACE0 + i * STEP;
            const o = interpolate(f, [start, start + 16], [0, 1], clamp);
            const pop = interpolate(f, [start, start + 22], [0.7, 1], { ...clamp, easing: Easing.out(Easing.back(1.2)) });
            const drop = interpolate(f, [start, start + 24], [-40, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
            // 選択タイルはタップで軽く沈む
            const press = i === pick ? interpolate(f, [TAP, TAP + 8, TAP + 18], [1, 0.95, 1], clamp) : 1;
            const c = cards[i];
            const nm = (c.disp && c.disp.length) ? c.disp : c.caption;
            const nl = splitLines(nm); const nml = nl.length ? nl : [nm];
            const sz = heroSize(nm, 33, 24);
            return (
              <div key={i} style={{
                position: "absolute", left: L.x - TW / 2, top: L.y - (PH + LH) / 2 + drop,
                width: TW, opacity: o * gridO,
                transform: "scale(" + (pop * press) + ")",
                borderRadius: 18, overflow: "hidden",
                boxShadow: "0 22px 50px rgba(0,0,0,0.55)", border: "1px solid rgba(255,235,205,0.14)",
              }}>
                <div style={{ width: TW, height: PH, overflow: "hidden", background: "#000" }}>
                  <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ height: LH, background: "linear-gradient(180deg, #2b2118 0%, #221a12 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px" }}>
                  <div style={{ fontFamily: mincho, color: "#F4EAD8", fontSize: sz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.12, textAlign: "center" }}>
                    {nml.map((ln, k) => <div key={k}>{ln}</div>)}
                  </div>
                </div>
              </div>
            );
          }) : null}

          {/* タップのリング＋指先（選択タイルの上） */}
          {ringO > 0.001 ? (
            <div style={{ position: "absolute", left: pos[pick].x, top: pos[pick].y, width: 240, height: 240, marginLeft: -120, marginTop: -120, borderRadius: "50%", border: "5px solid " + T.accent, opacity: ringO, transform: "scale(" + ringS + ")", transformOrigin: "center", pointerEvents: "none" }} />
          ) : null}
          {fingerO > 0.001 ? (
            <div style={{ position: "absolute", left: pos[pick].x + 34, top: pos[pick].y + 30 + fingerDip, opacity: fingerO, fontSize: 92, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }}>👆</div>
          ) : null}

          {/* 選んだ1品のアップ（ズームイン・大きく紹介） */}
          {featO > 0.001 ? (
            <div style={{ position: "absolute", left: 0, top: 0, width: 1000, marginLeft: -500, marginTop: -600, transform: "scale(" + featS + ")", transformOrigin: "500px 0", opacity: featO }}>
              <div style={{ width: 1000, height: 800, overflow: "hidden", borderRadius: 24, border: "1px solid " + T.accent + "66", boxShadow: "0 40px 90px rgba(0,0,0,0.65)", background: "#000" }}>
                <Img src={staticFile(sel.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ marginTop: 30, textAlign: "center", opacity: featTxtO }}>
                {sel.sub ? <div style={{ fontFamily: serif, color: T.accent, fontSize: 32, letterSpacing: 5, textTransform: "uppercase", fontWeight: 600, marginBottom: 10, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{sel.sub}</div> : null}
                <div style={{ fontFamily: mincho, color: "#FBF3E4", fontSize: selSz, fontWeight: 700, letterSpacing: 1, lineHeight: 1.14, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}>{selOne}</div>
                {sel.desc ? <div style={{ marginTop: 18, fontFamily: mincho, color: "#EFE3CC", fontSize: 38, letterSpacing: 1, lineHeight: 1.55, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{sel.desc}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* フッター：店舗ロゴ＋ハンドル */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: SAFE.bottom - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: fade(f, POLA_LOGO_IN) }}>
        <StoreLogo storeName={storeName} height={80} />
        <div style={{ fontFamily: serif, color: T.accent, fontSize: 24, letterSpacing: 5 }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
