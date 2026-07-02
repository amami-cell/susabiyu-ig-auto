/* パターンD試作：FFCreatorLite（既製エフェクト自動型）で 9:16 ストーリーズ動画を生成。
   Remotion(パターンA)と同じ写真・同じBGMを使い、方式の違いを見比べる用。
   使い方: node ffc_sample.js  →  out/ffc.mp4 */
const path = require("path");
const fs = require("fs");
const { FFCreator, FFScene, FFImage, FFText } = require("ffcreatorlite");

const W = 1080, H = 1920;

// 日本語フォント（GitHub Actionsの Noto CJK）
const FONTS = [
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
];
const FONT = FONTS.find((p) => fs.existsSync(p)) || "";

// tempoData.ts から写真とBGMを流用（正規表現で読むだけ）
function loadPhotos() {
  const out = [];
  try {
    const s = fs.readFileSync("src/tempoData.ts", "utf8");
    const re = /\{\s*src:\s*"([^"]+)",\s*caption:\s*"([^"]*)"\s*\}/g;
    let m;
    while ((m = re.exec(s))) out.push({ src: "public/" + m[1], caption: m[2] });
  } catch (e) {}
  return out.filter((p) => fs.existsSync(p.src)).slice(0, 5);
}
function loadMusic() {
  try {
    const s = fs.readFileSync("src/tempoData.ts", "utf8");
    const m = s.match(/tempoMusic\s*=\s*"([^"]+)"/);
    if (m && fs.existsSync("public/" + m[1])) return "public/" + m[1];
  } catch (e) {}
  return fs.existsSync("public/bgm.mp3") ? "public/bgm.mp3" : "";
}

const photos = loadPhotos();
if (!photos.length) {
  console.error("[FFC] 写真がありません（fetch_tempo を先に実行）");
  process.exit(1);
}
fs.mkdirSync("out", { recursive: true });
fs.mkdirSync("cache", { recursive: true });

const creator = new FFCreator({
  cacheDir: path.join(__dirname, "cache"),
  outputDir: path.join(__dirname, "out"),
  output: path.join(__dirname, "out", "ffc.mp4"),
  width: W, height: H, fps: 30, log: false,
});

const music = loadMusic();
if (music) {
  try { creator.addAudio({ path: path.join(__dirname, music), volume: 0.8, fadeIn: 1, fadeOut: 2 }); }
  catch (e) { console.log("[FFC] BGMスキップ:", e.message); }
}

// タイトルシーン
const intro = new FFScene();
intro.setBgColor("#140b07");
intro.setDuration(2.6);
const t1 = new FFText({ text: "すさび湯 三条", x: W / 2, y: 800, fontSize: 96, color: "#ffffff" });
if (FONT) t1.setFont(FONT);
t1.alignCenter && t1.alignCenter();
t1.addEffect("fadeIn", 1, 0.2);
intro.addChild(t1);
const t2 = new FFText({ text: "本日のおすすめ", x: W / 2, y: 960, fontSize: 56, color: "#d4a574" });
if (FONT) t2.setFont(FONT);
t2.alignCenter && t2.alignCenter();
t2.addEffect("fadeIn", 1, 0.8);
intro.addChild(t2);
creator.addChild(intro);

// 写真シーン（既製エフェクトをローテーション）
const FX = ["zoomIn", "moveInRight", "moveInLeft", "fadeIn", "zoomIn"];
photos.forEach((p, i) => {
  const sc = new FFScene();
  sc.setBgColor("#140b07");
  sc.setDuration(2.4);
  const img = new FFImage({ path: path.join(__dirname, p.src), x: W / 2, y: H / 2, width: W, height: H });
  img.addEffect(FX[i % FX.length], 1.2, 0);
  sc.addChild(img);
  if (p.caption) {
    const cap = new FFText({ text: p.caption, x: W / 2, y: H - 300, fontSize: 64, color: "#ffffff" });
    if (FONT) cap.setFont(FONT);
    cap.alignCenter && cap.alignCenter();
    cap.addEffect("fadeIn", 0.8, 0.5);
    sc.addChild(cap);
  }
  creator.addChild(sc);
});

// 締めシーン
const outro = new FFScene();
outro.setBgColor("#140b07");
outro.setDuration(2.6);
const t3 = new FFText({ text: "ご来店お待ちしております", x: W / 2, y: 860, fontSize: 68, color: "#ffffff" });
if (FONT) t3.setFont(FONT);
t3.alignCenter && t3.alignCenter();
t3.addEffect("fadeIn", 1, 0.2);
outro.addChild(t3);
const t4 = new FFText({ text: "@susabiyu_sanjyo", x: W / 2, y: 1000, fontSize: 48, color: "#d4a574" });
if (FONT) t4.setFont(FONT);
t4.alignCenter && t4.alignCenter();
t4.addEffect("fadeIn", 1, 0.8);
outro.addChild(t4);
creator.addChild(outro);

const killer = setTimeout(() => { console.error("[FFC] タイムアウト"); process.exit(1); }, 15 * 60 * 1000);
creator.on("error", (e) => { console.error("[FFC] エラー:", e.error || e); process.exit(1); });
creator.on("progress", (e) => {
  const pct = Math.round((e.percent || 0) * 100);
  if (pct % 20 === 0) console.log("[FFC] " + pct + "%");
});
creator.on("complete", (e) => {
  clearTimeout(killer);
  const file = (e && e.output) || creator.getFile && creator.getFile();
  console.log("[FFC] 完成:", file);
  try {
    if (file && file !== path.join(__dirname, "out", "ffc.mp4")) {
      fs.copyFileSync(file, path.join(__dirname, "out", "ffc.mp4"));
    }
  } catch (err) {}
  process.exit(0);
});
creator.start();
