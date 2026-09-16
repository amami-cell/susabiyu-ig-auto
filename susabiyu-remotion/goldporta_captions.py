# -*- coding: utf-8 -*-
"""GOLD京都ポルタ（フレンチ酒場）：投稿キャプションを「ソムリエのお姉さん」トーンで生成する。

トーン（ユーザー承認済み・2026-09）：
  ・ナガグツ（元気なお姉さん）とフレンチ酒場（しっとり）の“中間”。
  ・ワインに詳しくて上品、でも親しみやすい。です・ます調。
  ・**必ずワインのペアリングを一言**添える（品種・温度・理屈まで少し専門的に）。
  ・絵文字はほどほど（🍷を軸に、1段落に1つ程度）。
  ・NG：「〜よ。」で終わる言い方（上から目線に感じる）／不自然な言い回し。

ナガグツと違い、GOLDの料理名は Drive のフォルダ（名物/グリル・オーブン/冷菜/温菜/
パスタ/デザート/ランチ）から来る。全品を手書きせず、**料理名のキーワード＋カテゴリ**から
決定論的にソムリエ文＋ペアリングを組み立てる（同じ料理なら毎回同じ＝見本比較がブレない）。
"""
import re

# ブランド共通タグ。
BASE_TAGS = "#GOLD京都ポルタ #フレンチ酒場 #ビストロ"

# 集客用の地域・ジャンルタグ（京都駅前ポルタ）。
POI_TAGS = ("#京都 #京都グルメ #京都ディナー #京都駅 #京都ポルタ #京都フレンチ "
            "#京都ビストロ #京都ワイン #京都バル #京都デート #京都駅グルメ "
            "#ワインのある生活 #ワイン好きと繋がりたい #記念日 #フレンチ")

# 投稿本文の末尾フッター。
# ※店舗受付シートの GOLD京都ポルタ 行は 住所/営業時間/アクセス が未記入（2026-09）。
#   判明分（店名・業態・エリア）だけで組む。シートが埋まったら _HOURS/_ADDR/_ACCESS を足す。
_SEP = "▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️▪️"
FOOTER = "\n".join([
    _SEP,
    "⁡",
    "ゴールド京都ポルタ（フレンチ酒場）",
    "⁡",
    "📍京都駅前・京都ポルタ（京都市）",
    "⁡",
    _SEP,
    "⁡",
    "その日のおすすめワインは、お気軽にスタッフまで🍷 ごゆっくりお楽しみください。",
])


def clean(name):
    return re.sub(r"\s+", " ", re.sub(r"[_＿]", "　", str(name or ""))).strip()


# ── ワインのペアリング（ソムリエの一言）──────────────────────────
# 料理名のキーワードで白/赤(重)/赤(軽)/泡/デザート を判定して、品種・温度・理屈を返す。
_PAIR_WHITE = (
    "合わせるなら、ソーヴィニヨン・ブランやシャブリのような酸のはっきりした辛口白を8〜10℃で🥂 "
    "素材の繊細な旨みを、すっと引き立ててくれます。")
_PAIR_WHITE_RICH = (
    "合わせるなら、樽香のあるシャルドネを少し高めの12℃前後で🥂 "
    "コクのある白が、クリーミーな味わいと重なります。")
_PAIR_RED_BODY = (
    "合わせるのは、しっかりタンニンのボルドー、または果実味豊かなローヌのシラー🍷 "
    "料理のコクと重なって、余韻が長く続きます。")
_PAIR_RED_LIGHT = (
    "ブルゴーニュのピノ・ノワールを少し低めの14℃前後で🍷 "
    "軽やかな酸と赤い果実が、旨みをきれいにまとめてくれます。")
_PAIR_SPARK = (
    "まずは泡を一杯🥂 シャンパーニュやクレマンの繊細な泡が、"
    "塩気と脂を流して口の中をリセットしてくれます。")
_PAIR_DESSERT = (
    "食後は、甘口の貴腐ワインやエスプレッソと一緒に🍫 "
    "余韻までゆっくりお楽しみいただけます。")
_PAIR_DEFAULT = (
    "その日のコンディションに合わせて、一本お選びします🥂 "
    "お好みをスタッフにお聞かせください。")

_KW_WHITE = ("カルパッチョ", "マリネ", "魚", "鮮魚", "白身", "貝", "牡蠣", "カキ", "帆立", "ホタテ",
             "海老", "エビ", "蛸", "タコ", "ムール", "アヒージョ", "サラダ", "カプレーゼ",
             "サーモン", "しらす", "野菜", "きのこ", "アスパラ")
_KW_WHITE_RICH = ("グラタン", "クリーム", "カルボナーラ", "チーズ", "キッシュ", "ブランダード", "ポタージュ")
_KW_RED_BODY = ("牛", "ステーキ", "ほほ", "すね", "煮込み", "赤ワイン", "ラム", "羊", "鴨", "ジビエ",
                "ハンバーグ", "グリル", "ロースト", "炭火", "骨付き", "肉")
_KW_RED_LIGHT = ("パテ", "テリーヌ", "レバー", "リエット", "ソーセージ", "ハム", "シャルキュトリ",
                 "ボロネーゼ", "ミート", "トマト")
_KW_SPARK = ("生ハム", "フリット", "揚げ", "アヒージョ", "オリーブ", "前菜", "盛り合わせ", "ポテト")
_KW_DESSERT = ("デザート", "ドルチェ", "ケーキ", "タルト", "ブリュレ", "カタラーナ", "ティラミス",
               "ジェラート", "アイス", "プリン", "ムース", "ガトー", "パフェ", "ソルベ")


def pairing_for(name):
    d = clean(name)
    if any(k in d for k in _KW_DESSERT):
        return _PAIR_DESSERT
    # パスタはソースで分岐（クリーム/魚介→白、ミート/トマト→軽い赤）
    if "パスタ" in d or "スパゲ" in d or "ペンネ" in d or "ニョッキ" in d or "リゾット" in d:
        if any(k in d for k in ("クリーム", "カルボナーラ", "チーズ", "ジェノベーゼ")):
            return _PAIR_WHITE_RICH
        if any(k in d for k in ("ボロネーゼ", "ミート", "肉", "トマト")):
            return _PAIR_RED_LIGHT
        return _PAIR_WHITE
    if any(k in d for k in _KW_WHITE_RICH):
        return _PAIR_WHITE_RICH
    if any(k in d for k in _KW_RED_BODY):
        return _PAIR_RED_BODY
    if any(k in d for k in _KW_WHITE):
        return _PAIR_WHITE
    if any(k in d for k in _KW_RED_LIGHT):
        return _PAIR_RED_LIGHT
    if any(k in d for k in _KW_SPARK):
        return _PAIR_SPARK
    return _PAIR_DEFAULT


# 料理の説明（カテゴリ/キーワードから“それらしい”一文）。名前は本文にそのまま載せる。
def _desc_for(name):
    d = clean(name)
    table = [
        (("名物", "看板"), "当店自慢の看板料理です🍴"),
        (("グリル", "ロースト", "炭火", "オーブン", "焼き"), "香ばしく焼き上げた一皿です🍴"),
        (("カルパッチョ", "マリネ", "冷製", "冷菜", "サラダ", "カプレーゼ"), "素材の持ち味を活かした、爽やかな一皿です🥗"),
        (("アヒージョ",), "ガーリックオイルで旨みを引き出した、温かい一皿です🔥"),
        (("パスタ", "スパゲ", "ペンネ", "ニョッキ", "リゾット"), "本日のパスタです🍝"),
        (("パテ", "テリーヌ", "生ハム", "リエット", "シャルキュトリ"), "ワインが進む、大人の前菜です🍷"),
        (("デザート", "ドルチェ", "ケーキ", "タルト", "ブリュレ", "ティラミス", "ジェラート"), "食後の甘いお楽しみです🍰"),
        (("煮込み", "ほほ", "すね"), "じっくり煮込んだ、とろける一皿です🍲"),
        (("フリット", "揚げ", "ポテト"), "外はさっくり、できたてが一番おいしい一皿です🍴"),
    ]
    for keys, txt in table:
        if any(k in d for k in keys):
            return txt
    return "本日のおすすめの一皿です🍴"


# 冒頭のあいさつ（決定論的に1本選ぶ＝同じ料理なら毎回同じ）。
_OPENERS = [
    "こんばんは、今夜のおすすめです🍷",
    "今宵のおすすめを、ひとつ🍷",
    "本日のおすすめ、ご紹介します🍷",
    "今夜は、こちらはいかがでしょう🍷",
]


def _seed(name):
    s = clean(name)
    return sum(ord(c) for c in s) if s else 0


def caption_for(name):
    """戻り値 dict: title / story（短句）/ cap（動画に焼く短い説明）/ post（SNS本文）/ tags。"""
    d = clean(name)
    opener = _OPENERS[_seed(name) % len(_OPENERS)]
    desc = _desc_for(name)
    pair = pairing_for(name)
    # 本文（元気お姉さんより落ち着いた、ソムリエトーン。段落3つ）。
    post = "%s\n\n%s、%s\n\n%s" % (opener, d, desc, pair)
    # 動画テンプレ用の短い説明（cap）と一言（story）はペアリングの要点を短く。
    cap = "%s\n%s" % (d, "ワインと共に、ごゆっくり。")
    story = "ワインと、フレンチと。"
    tags = _uniq_tags(BASE_TAGS)
    return {"title": d, "story": story, "cap": cap, "post": post, "tags": tags}


def _uniq_tags(*groups):
    seen, out = set(), []
    for g in groups:
        for t in str(g or "").split():
            if t and t not in seen:
                seen.add(t)
                out.append(t)
    return " ".join(out)


def story_for(name):
    return caption_for(name)["story"]


def post_caption(names, handle=""):
    """投稿本文（Instagramキャプション）。先頭料理のソムリエ本文＋フッター＋集客タグ。
    並び：本文 → 店舗情報フッター → ハッシュタグ（一番下に1箇所）。"""
    names = [str(n).strip() for n in (names or []) if str(n).strip()]
    if not names:
        return ""
    body = caption_for(names[0]).get("post") or ""
    tags = []
    for t in (BASE_TAGS + " " + POI_TAGS).split():
        if t and t not in tags:
            tags.append(t)
    parts = [body, FOOTER, " ".join(tags[:30])]
    return "\n\n".join([p for p in parts if p])


if __name__ == "__main__":
    import sys
    samples = sys.argv[1:] or [
        "牛ほほ肉の赤ワイン煮込み", "本日の鮮魚のカルパッチョ", "パテ・ド・カンパーニュ",
        "ムール貝の白ワイン蒸し", "きのこのアヒージョ", "鴨のロースト",
        "クレームブリュレ", "生ハムの盛り合わせ", "本日のパスタ　ボロネーゼ",
    ]
    for n in samples:
        c = caption_for(n)
        print("● %s" % c["title"])
        print(c["post"])
        print("-" * 40)
    print("\n===== post_caption サンプル（牛ほほ肉）=====\n")
    print(post_caption(["牛ほほ肉の赤ワイン煮込み"]))
