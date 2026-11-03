# -*- coding: utf-8 -*-
"""大衆食堂 こまつ原（大阪・梅田小松原／居酒屋・食堂・大衆酒場）：料理テキスト生成。

コンセプト（店舗受付シートより）：
  「昼サケ・夜メシ」昼は気軽にお酒とおばんざい、夜は食事もお酒も楽しめる食堂酒場。
  キャッチ：昼サケ、夜メシ。大人のための均一酒場。

トーン：大阪の大衆食堂／居酒屋。気さくで親しみやすく、でも品よく。
  ・動画に焼く desc は“食欲をそそる短い一文”（絵文字・ハッシュタグ・予約導線は入れない）。
  ・post_caption は投稿本文（挨拶→料理の魅力→締め→店舗フッター→ハッシュタグ）。

※メニュー実データ（Drive写真）はオープン後に入るため、現時点では料理ごとの手書き表は持たず、
  カテゴリ・キーワードのフォールバックで決定論的に生成する（同じ料理なら毎回同じ）。
  将来、定番品が固まったら _DISH_DESC に手書き決定版を足せばそのまま昇格できる（karasuma方式）。

fetch_typo.py が desc_for/name_broken/story_for/sub_for/catch/post_caption を呼ぶ
（STORE_ACCOUNT="komatsubara" のときだけ）。
"""
import re


def clean(name):
    return re.sub(r"\s+", " ", re.sub(r"[_＿]", "　", str(name or ""))).strip()


def _norm(name):
    s = clean(name)
    s = re.sub(r"[ 　\s]", "", s)
    s = re.sub(r"[【】〔〕\[\]（）()｜|・「」『』〈〉《》]", "", s)
    return s.strip()


def _seed(name):
    d = clean(name)
    return sum(ord(c) for c in d) if d else 0


def _pick(pool, seed):
    return pool[seed % len(pool)] if pool else ""


# ── 料理ごとの説明文（動画・フィード画像に焼く desc）──────────────
# 現時点は手書き表は空。定番が固まったらここに「品名: 説明」を足す（_norm で表記揺れ吸収）。
_DISH_DESC = {}
_DISH_DESC_N = None

# カテゴリ別フォールバック（上から順に判定＝具体的なものを先に）。
_DESC_TABLE = [
    (("おばんざい", "小鉢", "惣菜", "総菜", "日替", "本日の"), "日替わりのおばんざい、好きなだけどうぞ。"),
    (("刺身", "お造り", "造り", "たたき", "刺し", "なめろう"), "鮮度のよい旬の魚を、ていねいに。"),
    (("てっちり", "ふぐ", "トラフグ", "河豚"), "名物てっちり、身も出汁もまるごと。"),
    (("鍋", "もつ鍋", "すき焼", "寄せ鍋"), "あつあつの鍋を、みんなでつつく幸せ。"),
    (("天ぷら", "天麩羅", "かき揚げ", "天"), "揚げたてサクッと、旬をころもに。"),
    (("唐揚げ", "から揚げ", "フライ", "竜田", "揚げ"), "できたてのサクッを、あつあつのうちに。"),
    (("焼き", "炙り", "串", "塩焼", "照り焼"), "香ばしく焼き上げた、ごはんにもお酒にも。"),
    (("煮込", "煮物", "煮付", "炊き", "おでん"), "じっくり味しみ、ほっとする煮込み。"),
    (("出汁巻", "だし巻", "玉子", "卵"), "だしをきかせた、ふんわり玉子。"),
    (("漬物", "ぬか", "酢の物", "和え", "おひたし", "冷奴", "豆腐"), "箸休めにうれしい、さっぱりひと品。"),
    (("ポテサラ", "ポテト", "サラダ"), "みんな大好き、ほっとするひと皿。"),
    (("ごはん", "ご飯", "丼", "飯", "めし", "〆", "締め", "うどん", "そば", "麺", "雑炊"), "〆まで、しっかりおいしい。"),
    (("刺身", "海鮮"), "海の幸を、気軽にひと皿。"),
    (("肉", "牛", "豚", "鶏", "ホルモン", "もつ"), "旨みをぎゅっと、満足のひと皿。"),
]
_DEFAULT_DESC = "できたてのおいしさを、気軽にどうぞ。"


def desc_for(name):
    global _DISH_DESC_N
    if _DISH_DESC_N is None:
        _DISH_DESC_N = {_norm(k): v for k, v in _DISH_DESC.items()}
    d = _norm(name)
    if d in _DISH_DESC_N:
        return _DISH_DESC_N[d]
    for keys, txt in _DESC_TABLE:
        if any(_norm(k) in d for k in keys):
            return txt
    return _DEFAULT_DESC


def name_broken(name):
    """表示用の料理名。改行は描画側の自動フィットに任せる（手動指定なし）。"""
    return clean(name)


# ── 動画に焼く短句（story）：料理ごとに決定論的に1本 ─────────────
_STORY_POOLS = [
    (("おばんざい", "小鉢", "惣菜", "日替", "本日の"),
     ["本日のおばんざい。", "今日のおかず、これ。", "好きなだけ、どうぞ。"]),
    (("てっちり", "ふぐ", "トラフグ", "鍋", "もつ"),
     ["あつあつ、囲もう。", "鍋の季節です。", "みんなで、つつこう。"]),
    (("刺身", "お造り", "造り", "たたき", "海鮮"),
     ["旬を、ひと皿。", "鮮度で、勝負。", "今日のいい魚。"]),
    (("天ぷら", "唐揚げ", "揚げ", "フライ"),
     ["揚げたてを、さくっと。", "できたてが、ごちそう。"]),
    (("ごはん", "丼", "〆", "締め", "麺", "うどん", "雑炊"),
     ["〆まで、旨い。", "締めの一膳。"]),
]
_STORY_DEFAULT = ["昼サケ、夜メシ。", "今日のアテ、これ。", "気軽に一杯。", "うまいもん、あります。"]


def story_for(name):
    d = clean(name)
    pool = _STORY_DEFAULT
    for keys, p in _STORY_POOLS:
        if any(k in d for k in keys):
            pool = p
            break
    return _pick(pool, _seed(name))


# ── フィード画像に小さく添える欧文サブ（category ラベル）──────
def sub_for(name):
    d = clean(name)
    if any(k in d for k in ("おばんざい", "小鉢", "惣菜", "総菜", "日替", "本日の")):
        return "OBANZAI"
    if any(k in d for k in ("てっちり", "ふぐ", "トラフグ", "河豚")):
        return "FUGU"
    if any(k in d for k in ("鍋", "もつ鍋", "すき焼", "寄せ鍋", "おでん")):
        return "NABE"
    if any(k in d for k in ("刺身", "お造り", "造り", "たたき", "海鮮", "なめろう")):
        return "SASHIMI"
    if any(k in d for k in ("天ぷら", "天麩羅", "かき揚げ")):
        return "TEMPURA"
    if any(k in d for k in ("唐揚げ", "から揚げ", "フライ", "竜田", "揚げ")):
        return "AGEMONO"
    if any(k in d for k in ("焼き", "炙り", "串", "塩焼", "照り焼")):
        return "YAKIMONO"
    if any(k in d for k in ("煮込", "煮物", "煮付", "炊き")):
        return "NIKOMI"
    if any(k in d for k in ("肉", "牛", "豚", "鶏", "ホルモン", "もつ")):
        return "NIKU"
    if any(k in d for k in ("ごはん", "ご飯", "丼", "飯", "めし", "麺", "うどん", "そば", "雑炊")):
        return "SHIME"
    return "SHOKUDO"


# ── フィード投稿本文（Instagramキャプション）───────────────────────
# 住所・営業時間・アクセス・電話は店舗受付シート（入力用・行「大衆食堂 こまつ原」）の実データ。
# 予約リンクは未確定のため「プロフィールのリンク、またはお電話で」。
_SEP = "▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️"
FOOTER = "\n".join([
    _SEP,
    "⁡",
    "大衆食堂 こまつ原（大阪・梅田小松原／大衆酒場・食堂）",
    "⁡",
    "営業時間：11:30〜23:00",
    "⁡",
    "📍大阪府大阪市北区小松原町5-14 小松原ビル",
    "⁡",
    "🚶各線 梅田駅より徒歩5分／東梅田駅から325m",
    "☎ 06-6367-0388",
    "⁡",
    _SEP,
    "⁡",
    "ご予約はプロフィールのリンク、またはお電話で🍶",
])

# ブランド系＋大阪・梅田POIタグ（店舗受付シートの定番タグを核に、重複除去で最大30本）。
BASE_TAGS = "#大衆食堂こまつ原 #こまつ原"
POI_TAGS = ("#大阪グルメ #梅田グルメ #大衆酒場 #堂山グルメ #小松原グルメ #大衆食堂 #梅田ランチ "
            "#梅田ディナー #梅田居酒屋 #梅田飲み #大阪居酒屋 #おばんざい #大阪グルメ好きと繋がりたい "
            "#umeda #osakafood")

# 料理名キーワード → 料理タグ（上から順に該当を集める。複数該当OK）。
_TAG_RULES = [
    (("てっちり", "ふぐ", "トラフグ", "河豚"), "#てっちり #トラフグ #ふぐ"),
    (("おばんざい", "小鉢", "惣菜", "日替", "本日の"), "#おばんざい"),
    (("刺身", "お造り", "造り", "たたき", "海鮮", "なめろう"), "#刺身 #海鮮"),
    (("鍋", "もつ鍋", "すき焼", "寄せ鍋", "おでん"), "#鍋 #居酒屋"),
    (("天ぷら", "天麩羅", "かき揚げ"), "#天ぷら"),
    (("唐揚げ", "から揚げ", "竜田"), "#唐揚げ"),
    (("焼き", "炙り", "串", "塩焼", "照り焼"), "#焼き物"),
    (("煮込", "煮物", "煮付", "炊き"), "#煮込み"),
    (("肉", "牛", "豚", "鶏", "ホルモン", "もつ"), "#肉料理"),
    (("ごはん", "丼", "麺", "うどん", "そば", "雑炊", "〆", "締め"), "#〆"),
]

_OPENERS = [
    "こんばんは、大衆食堂こまつ原です🏮",
    "こんばんは、梅田・小松原の大衆食堂こまつ原です🏮",
    "こんばんは、こまつ原です。昼サケ、夜メシ🍶",
]
# 判定は上から順。具体カテゴリを広いルールより前に。
_APPEAL_RULES = [
    (("てっちり", "ふぐ", "トラフグ", "河豚"),
     ["名物のてっちり、身も出汁も余さず楽しんでください。"]),
    (("おばんざい", "小鉢", "惣菜", "日替", "本日の"),
     ["その日のおばんざいを、好きなだけ気軽に。"]),
    (("刺身", "お造り", "造り", "たたき", "海鮮", "なめろう"),
     ["鮮度のよいものだけを、ていねいに仕込みました。"]),
    (("鍋", "もつ鍋", "すき焼", "寄せ鍋", "おでん"),
     ["あつあつの鍋を、ゆっくり囲んでくださいね。"]),
    (("天ぷら", "唐揚げ", "揚げ", "フライ", "竜田"),
     ["揚げたてのおいしさを、ぜひ熱いうちに。"]),
    (("焼き", "炙り", "串", "塩焼", "照り焼"),
     ["香ばしく焼き上げた、お酒にもごはんにも合う一品です。"]),
    (("肉", "牛", "豚", "鶏", "ホルモン", "もつ"),
     ["旨みをぎゅっと、満足のひと皿に仕立てました。"]),
    (("ごはん", "丼", "麺", "うどん", "そば", "雑炊", "〆", "締め"),
     ["〆まで、しっかりおいしくどうぞ。"]),
]
_APPEAL_DEFAULT = ["気取らず、でもていねいに。うまいもんをご用意しています。"]
_CLOSERS = [
    "昼は気軽に一杯、夜はしっかり一膳。ふらっと寄ってくださいね。",
    "仕事帰りにも、ちょっと一杯にも。気軽にどうぞ。",
    "梅田・小松原で、ほっとひと息つきにいらしてください。",
    "できたてのうちに、ぜひ味わいにいらしてください。",
]


def _appeal_for(name):
    d = clean(name)
    for keys, pool in _APPEAL_RULES:
        if any(k in d for k in keys):
            return _pick(pool, _seed(name) // 3)
    return _pick(_APPEAL_DEFAULT, 0)


def _dish_tags(name):
    d = clean(name)
    out = []
    for keys, tags in _TAG_RULES:
        if any(k in d for k in keys):
            for t in tags.split():
                if t not in out:
                    out.append(t)
    return out


def catch(name=""):
    """フィード画像に小さく添えるブランドの一言（料理名とは別軸の世界観コピー）。"""
    pool = ["昼サケ、夜メシ。", "大人のための均一酒場。", "気軽に一杯、しっかり一膳。", "梅田で、うまいもんを。"]
    return _pick(pool, _seed(name))


def caption_for(name, lunch=False):
    """フィード生成(nagagutsu_feed.py)が料理ごとに呼ぶ統合ヘルパー。
    戻り値 dict: title（表示名）/ story（短句）/ cap（焼き込む短い説明）/
    post（投稿本文）/ tags（スペース区切りのハッシュタグ）。
    lunch=True は「ランチ」フォルダの昼メニュー（締めの一言だけ昼向けに寄せる）。"""
    d = clean(name)
    # ハッシュタグ：料理別タグ＋業態＋ブランド＋エリア（重複除去・上限30）
    tags = []
    for t in _dish_tags(name):
        if t not in tags:
            tags.append(t)
    for t in ("#居酒屋 #食堂 " + BASE_TAGS + " " + POI_TAGS).split():
        if t and t not in tags:
            tags.append(t)
    return {
        "title": name_broken(name) or d,
        "story": story_for(name),
        "cap": desc_for(name),
        "post": post_caption([name]),
        "tags": " ".join(tags[:30]),
    }


def post_caption(names, handle=""):
    """投稿本文（Instagramキャプション）を組み立てる。先頭料理を主役に、
    挨拶→料理の魅力→締め→フッター→ハッシュタグ。"""
    names = [str(n).strip() for n in (names or []) if str(n).strip()]
    if not names:
        return ""
    lead = names[0]
    s = _seed(lead)
    opener = _pick(_OPENERS, s)
    body = (desc_for(lead) + " " + _appeal_for(lead)).strip()
    closer = _pick(_CLOSERS, s // 2)
    head = "\n\n".join([p for p in (opener, body, closer) if p])

    tags = []
    for n in names:
        for t in _dish_tags(n):
            if t not in tags:
                tags.append(t)
    for t in ("#居酒屋 #食堂 " + BASE_TAGS + " " + POI_TAGS).split():
        if t and t not in tags:
            tags.append(t)

    return "\n\n".join([head, FOOTER, " ".join(tags[:30])])


if __name__ == "__main__":
    import sys
    ns = sys.argv[1:] or ["本日のおばんざい", "てっちり", "刺身盛り合わせ", "鶏の唐揚げ", "出汁巻き玉子", "〆の雑炊"]
    for n in ns:
        print("=" * 8, n, "=" * 8)
        print("story:", story_for(n), "| sub:", sub_for(n), "| desc:", desc_for(n))
        print(post_caption([n]))
        print()
