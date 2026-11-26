// -*- coding: utf-8 -*-
// こまつ原フィード画像を Q1〜Q5（グルメ投稿風オーバーレイ）で焼く。
//
// 既存パイプライン（nagagutsu_feed.py / feed_style=gifuya）が作った
//   <dir>/f_<slug>.jpg（4:5の生写真）と <dir>/feed.json
// を入力に、各料理へ Q1〜Q5 を「スラッグのハッシュで」安定割り当てし、
//   <dir>/fd_<slug>.jpg（デザイン済み投稿画像）を上書き生成する。
// さらに feed.json の各 item に design=fd_<slug>.jpg / design_id=qN を書き込む。
//
// 文字は1枚ずつ変える（大見出しのローテ・料理ジャンルにゆる連動）。
// スラッグのハッシュで決めるので毎回同じ割り当て＝「昨日と違う」混乱が起きない。
//
// 使い方:  node render.js <dir>   (<dir>=.../pwa/komatsubara)
// フォント: ZenKaku/しっぽり明朝は feeddesign/fonts/ に置く（CIでDL）。
//           Noto Serif CJK JP はシステム（fonts-noto-cjk）。
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const DIR = path.resolve(process.argv[2] || '');
if (!DIR || !fs.existsSync(path.join(DIR, 'feed.json'))) {
  console.error('[FD] feed.json が見つかりません:', DIR);
  process.exit(1);
}
const HERE = __dirname;
const FONTS = path.join(HERE, 'fonts');
const LOGO = 'file://' + path.join(HERE, 'assets', 'logo_h_white.png');
const fontCss = `
@font-face{font-family:'G';src:url('file://${path.join(FONTS, 'ZenKakuGothicNew-Black.ttf')}');font-weight:400 900}
@font-face{font-family:'Mb';src:url('file://${path.join(FONTS, 'ShipporiMincho-Bold.ttf')}');font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
.stage{position:relative;width:1080px;height:1350px;color:#fff}
.cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
`;

// ---- 文言プール ----
const SHORT_GEN = ['圧倒的にうまい', '気取らずうまい', '今日も大衆の味', '名物これ食べて', 'うまいもん多数'];
const SHORT_NOODLE = ['出汁がしみる', 'ちょい呑み。', '昼から一杯。', '圧倒的にうまい', '〆の一杯。'];
const SHORT_FRY = ['やみつき注意', '酒がすすむ。', '圧倒的にうまい', '気取らずうまい', 'ビールの友。'];
const SHORT_DRINK = ['酒がすすむ。', 'ちょい呑み。', '昼呑み、最高。', '夜メシにも。', '今日も大衆の味'];
const FULL = ['気取らず、うまいを。', 'うまい、安い、こまつ原。', '大阪のうまいもん。', '梅田で、ちょい呑み。', '仕事帰りに、一杯。'];
const P5HERO = ['大阪の豊かな恵みを<br>味わうなら', '梅田で愛される<br>大衆の味', 'うまいもん<br>揃えてます', '大阪・梅田の<br>台所です'];

function h(s) { // stable int from string
  return parseInt(crypto.createHash('md5').update(s).digest('hex').slice(0, 8), 16);
}
function pick(arr, s) { return arr[h(s) % arr.length]; }
function genre(n) {
  if (/(うどん|そば|ラーメン|麺|パスタ)/.test(n)) return 'noodle';
  if (/(唐揚げ|から揚げ|天ぷら|フライ|揚げ|カツ|コロッケ|天|ポテト)/.test(n)) return 'fry';
  if (/(刺|造り|酢|塩辛|わさび|おでん|漬け|冷|きゅうり|トマト)/.test(n)) return 'drink';
  return 'gen';
}
function shortFor(n, slug) {
  const pool = { noodle: SHORT_NOODLE, fry: SHORT_FRY, drink: SHORT_DRINK, gen: SHORT_GEN }[genre(n)];
  return pick(pool, slug + 'c');
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const HEAD = `<!doctype html><meta charset=utf-8><style>${fontCss}</style>`;

function P1(img, name, slug) {
  const c = shortFor(name, slug); const fs_ = c.length >= 7 ? 172 : 186;
  return HEAD + `<style>.sh{filter:drop-shadow(0 2px 6px rgba(0,0,0,.42))}
.hero{position:absolute;top:24px;right:40px;writing-mode:vertical-rl;font-family:'G';font-weight:900;font-size:${fs_}px;line-height:1;text-shadow:0 3px 10px rgba(0,0,0,.4)}
.loc{position:absolute;left:132px;bottom:72px;font-family:'Noto Serif CJK JP',serif;font-weight:700;font-size:96px;border-bottom:7px solid #fff;padding-bottom:8px;text-shadow:0 2px 7px rgba(0,0,0,.5)}</style>
<div class=stage><img class=cover src="${img}"><div class="hero sh">${esc(c)}</div><span class="loc sh">大阪/梅田</span></div>`;
}
function P2(img, name, slug) {
  const rn = esc(name); const fs_ = name.length >= 9 ? 72 : 84; const tag = pick(['こまつ原名物', '梅田の味', '大衆の一品'], slug + 't');
  return HEAD + `<style>.sh{filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))}
.loc{position:absolute;top:40px;left:44px;background:rgba(68,65,66,.60);padding:4px 26px 16px;font-family:'G';font-weight:900;font-size:130px;line-height:1.08}
.r{position:absolute;top:58px;right:50px;writing-mode:vertical-rl;font-family:'Mb';font-weight:700;font-size:${fs_}px;letter-spacing:4px;text-shadow:0 2px 7px rgba(0,0,0,.5)}
.l{position:absolute;top:300px;left:470px;writing-mode:vertical-rl;font-family:'Mb';font-weight:700;font-size:56px;letter-spacing:3px;text-shadow:0 2px 7px rgba(0,0,0,.5)}
.ln{position:absolute;top:304px;left:536px;width:190px;height:3px;background:#fff;transform:rotate(-34deg);transform-origin:left center}
.logo{position:absolute;left:50%;transform:translateX(-50%);bottom:52px;width:620px}</style>
<div class=stage><img class=cover src="${img}"><div class=loc>梅田</div>
 <div class="r sh">${rn}</div><div class="ln"></div><div class="l sh">${tag}</div>
 <img class="logo sh" src="${LOGO}"></div>`;
}
function P3(img, name, slug) {
  const t = pick(FULL, slug + 'c');
  return HEAD + `<style>.sh{filter:drop-shadow(0 2px 8px rgba(0,0,0,.42))}
.loc{position:absolute;top:66px;left:56px;display:flex;align-items:flex-start;font-family:'Noto Serif CJK JP',serif}
.loc .a{writing-mode:vertical-rl;font-size:80px;font-weight:700;letter-spacing:2px;margin:8px 6px 0 0;line-height:1}
.loc .b{font-size:170px;font-weight:700;letter-spacing:2px;line-height:.9}
.br{position:absolute;right:54px;bottom:62px;text-align:right}
.br .t{font-family:'Noto Serif CJK JP',serif;font-weight:700;font-size:44px;letter-spacing:2px;margin-bottom:16px;text-shadow:0 2px 7px rgba(0,0,0,.5)}
.br img{width:430px}</style>
<div class=stage><img class=cover src="${img}">
 <div class="loc sh"><span class=a>大阪</span><span class=b>梅田</span></div>
 <div class="br sh"><div class=t>${esc(t)} 大衆食堂</div><img src="${LOGO}"></div></div>`;
}
function P4(img, name, slug) {
  return HEAD + `<style>
.loc{position:absolute;top:44px;left:44px;background:rgba(165,78,126,.52);padding:10px 32px 16px;font-family:'Noto Serif CJK JP',serif;font-weight:700;font-size:92px;letter-spacing:2px;line-height:1.05}
.lbox{position:absolute;right:44px;bottom:44px;background:rgba(165,78,126,.52);padding:30px 48px}
.lbox img{width:420px;display:block}</style>
<div class=stage><img class=cover src="${img}"><div class=loc>大阪/梅田</div><div class=lbox><img src="${LOGO}"></div></div>`;
}
function P5(img, name, slug) {
  const hero = pick(P5HERO, slug + 'c');
  return HEAD + `<style>.sh{filter:drop-shadow(0 2px 7px rgba(0,0,0,.4))}
.osaka{position:absolute;top:26px;left:26px;font-family:'G';font-weight:900;font-size:178px;line-height:.92}
.uline{position:absolute;top:236px;left:34px;width:300px;height:9px;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.4)}
.hgsi{position:absolute;top:256px;left:40px;font-family:'G';font-weight:700;font-size:74px;letter-spacing:10px;-webkit-text-stroke:4px rgba(30,24,20,.5);paint-order:stroke}
.hero{position:absolute;top:60px;right:46px;writing-mode:vertical-rl;font-family:'G';font-weight:900;font-size:90px;letter-spacing:2px;line-height:1.2;-webkit-text-stroke:4px rgba(30,24,20,.5);paint-order:stroke;text-shadow:0 3px 10px rgba(0,0,0,.3)}
.ol{paint-order:stroke;-webkit-text-stroke:6px rgba(30,24,20,.55)}
.logo{position:absolute;left:30px;bottom:92px;width:560px}</style>
<div class=stage><img class=cover src="${img}">
 <div class="osaka sh ol">大阪</div><div class="uline"></div><div class="hgsi sh">東梅田</div>
 <div class="hero sh">${hero}</div><img class="logo sh" src="${LOGO}"></div>`;
}
const PATS = [P1, P2, P3, P4, P5];

(async () => {
  const feedPath = path.join(DIR, 'feed.json');
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const items = feed.items || [];
  // 任意: 先頭N品だけ（動作確認）
  const lim = parseInt(process.env.FD_LIMIT || '0', 10);
  const work = lim > 0 ? items.slice(0, lim) : items;

  const browser = await chromium.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  let ok = 0, miss = 0;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const it of work) {
    const img = it.img || '';
    const m = /^f_([0-9a-f]+)\.jpg$/i.exec(img);
    const slug = m ? m[1] : (it.slug || crypto.createHash('md5').update(it.name || img).digest('hex').slice(0, 10));
    const src = path.join(DIR, img);
    if (!fs.existsSync(src)) { console.log('[FD] 写真なしスキップ', img); miss++; continue; }
    const pat = (h(slug + 'p') % 5) + 1; dist[pat]++;
    const html = PATS[pat - 1]('file://' + src, it.name || '', slug);
    try {
      // file:// のサブリソース(写真/ロゴ/フォント)を読ませるため、DIR配下に一時HTMLを
      // 書いて file:// origin で goto する（setContent=about:blank だと file:// が弾かれる）。
      const tmp = path.join(DIR, '.fd_tmp.html');
      fs.writeFileSync(tmp, html);
      await page.goto('file://' + tmp, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(80);
      const out = path.join(DIR, 'fd_' + slug + '.jpg');
      await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
      it.design = 'fd_' + slug + '.jpg';
      it.design_id = 'q' + pat;
      ok++;
      if (ok % 30 === 0) console.log('[FD] 焼き', ok);
    } catch (e) {
      console.log('[FD] WARN 焼き失敗', it.name, e.message); miss++;
    }
  }
  await browser.close();
  try { fs.unlinkSync(path.join(DIR, '.fd_tmp.html')); } catch (e) {}
  // feed.json を書き戻す（limit時は一部のみ更新＝本番コミットはしない運用）
  fs.writeFileSync(feedPath, JSON.stringify(feed, null, 1));
  console.log('[FD] 完了 ok=%d miss=%d 配分=%j', ok, miss, dist);
})().catch((e) => { console.error('[FD] FATAL', e); process.exit(1); });
