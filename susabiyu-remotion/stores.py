# -*- coding: utf-8 -*-
"""店舗レジストリ（単一の設定ソース）。

新しい店舗は、このファイルの STORES に1エントリ追加するだけで、三条と同じ
ストーリー生成パイプライン（prepare → 承認待ち → 承認 → post_approved 投稿）に
"一発で" 載る。三条は account="" のデフォルトエントリで、従来の挙動を一切変えない。

設計の肝：
  - 地域名（例「京都・河原町三条」）をJSXにベタ書きしている comp は店舗を差し替えられない。
    そこで新店は "region-free"（店名/地域を prop で受け取れる）comp 群だけを使い、
    レンダリング時に --props で storeName/handle/region を注入する（ぎふやで実証済みの方式）。
  - Drive のフォルダIDは fetch_*.py が読む GENRE_*_ID 環境変数で渡す（未指定なら各スクリプトの
    既定＝三条のまま）。だから account="" では環境を一切書き換えず、三条は完全に従来動作。
  - 承認待ち等のシートタブは tab_suffix（例 "_gifuyatenjin"）で店舗別に分離。三条は接尾辞なし。
"""
import os

SANJO_SHEET_ID = "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30"

# 地域名を焼き込まない（=店名/地域を prop で差し替えできる）comp に対応する pattern キー。
# 新店はこの集合から選べば、--props だけで安全に自店ブランドの動画になる。
# （prepare.REG のうち、地域ベタ書きが無い／region prop 対応済みの comp のみ）
REGION_FREE_PATTERNS = [
    "photo", "simple", "caption", "osusume", "gridzoom", "noren", "season",
    "taishufuda", "taishukaiten", "taishuzen", "taishugrid", "taishunoren",
    "taishutempo", "taishushun", "taishuhito", "taishugaku", "taishucap",
    "taishuimga", "taishuimga2", "taishuimgb", "taishuimgd", "taishuimgf",
    "oshinatate", "taishutanzaku",   # この2つは region prop 対応済み
]

# 【重要】region-free でも fetch_tempo/photostory/simple を使う comp は SAKE/内観/イベントの
# Drive フォルダも読む。新店がそれらのフォルダIDを登録していないと、その分だけ三条フォルダに
# フォールバックして写真が混入する。そこで「fetch_typo（食材フォルダのみ）＋実写真が食材だけ」で
# 完結し、かつ地域prop対応 or 地域無し、の安全な集合を用意（他店フォルダ混入ゼロ）。
# さらに安全側：ぎふや既存ストーリー動画(gifuya_render_stories.py)で --props レンダリングが
# 実証済み＝ロゴ/レイアウトもぎふやで破綻しない、と分かっている comp のみ。
# （osusume/season 等は fetch_typo で食材のみだが、ロゴ表示を実機確認してから追加する）
FOOD_ONLY_PATTERNS = [
    "taishuhito",    # TaishuHitosara（本日の一皿）
    "taishushun",    # TaishuShun（季節の旬）
    "taishunoren",   # TaishuAkanoren（暖簾）
    "taishutanzaku", # TaishuTanzaku（壁の短冊・region prop対応）
    "oshinatate",    # OshinaTate（お品書き縦・region prop対応）
    "noren",         # NorenStory（暖簾くぐり）
]

STORES = {
    # ── 三条（リファレンス）。account 未指定＝このエントリ＝従来どおり全パターン＋既定Drive ──
    "": {
        "account": "",
        "store_name": "すさび湯三条",
        "handle": "@susabiyu_sanjyo",
        "region": "京都・河原町三条",
        "sheet_id": SANJO_SHEET_ID,
        "tab_suffix": "",
        "folders": {},          # 空＝fetch_*.py の既定（三条）をそのまま使う（環境を書き換えない）
        "patterns": None,       # None＝全パターン＋decide をそのまま（三条は制限しない）
        "phrases_file": "phrases.json",
        "fallback_phrase": "京都の夜は、すさびで。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/",
        "slots_holiday": [11, 18, 20],
        "slots_weekday": [16, 18, 20],
    },
    # ── ぎふや 福岡天神店 ──
    "gifuyatenjin": {
        "account": "gifuyatenjin",
        "store_name": "ぎふや 福岡天神店",
        "handle": "@gifuya_fukuokatenjin",
        "region": "福岡・天神",
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_gifuyatenjin",
        "folders": {
            "food": "1HUtrzFFJiCuazZOhHBW88RVVdrvyh1Ox",          # ぎふや天神「画像」フォルダ
            "music_uptempo": "1pk6Lq_TKK4MRWLYRowOjjRRFUfBbyYh_",  # ぎふや BGM
            "music_normal": "1pk6Lq_TKK4MRWLYRowOjjRRFUfBbyYh_",
        },
        "patterns": FOOD_ONLY_PATTERNS,   # 食材フォルダのみで完結＝三条フォルダ混入ゼロ
        # 「画像」フォルダ配下の非料理サブフォルダは料理として使わない（ロゴ/ランチ/外観など）。
        # ランチは未営業のため除外。ドリンクは fetch 側が自動除外。
        "exclude_cats": ["ロゴ", "ランチ", "外観", "内観", "音楽", "集合", "ドリンク", "飲み"],
        # ぎふやの「画像」は写真が直下バラ置き＋一部サブフォルダ。fetch_typo を再帰収集モードに。
        "food_flat": True,
        "phrases_file": "phrases_gifuyatenjin.json",
        "fallback_phrase": "福岡・天神の夜は、ぎふやで。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/gifuyatenjin.html",
        "slots_holiday": [11, 17, 20],
        "slots_weekday": [11, 17, 20],
    },
    # ── ナガグツ（イタリアン・肉バル）。ぎふや天神と同じ food-only 方式 ──
    "nagagutsu": {
        "account": "nagagutsu",
        "store_name": "ナガグツ",
        "handle": "@nagagutsu0427",
        "region": "",                    # 所在地未確定＝空（region prop対応compでは非表示）。判明後に設定。
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_nagagutsu",
        "folders": {
            "food": "198v4GTeAMNbQJrSikPpQtFe314eUjBJU",          # ナガグツ「画像」フォルダ
            "music_uptempo": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",  # ナガグツ 音楽
            "music_normal": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",
        },
        "patterns": FOOD_ONLY_PATTERNS,   # 食材フォルダのみで完結＝他店フォルダ混入ゼロ
        # 「画像」配下の非料理サブフォルダは料理として使わない（ロゴ/外観内観/コース集合/ドリンク）。
        "exclude_cats": ["ロゴ", "外観", "内観", "音楽", "集合", "コース", "ドリンク", "飲み"],
        # 「画像」直下は フード/ドリンク… のサブフォルダ構成。fetch_typo を再帰収集モードに。
        "food_flat": True,
        "phrases_file": "phrases_nagagutsu.json",
        "fallback_phrase": "今宵は、ナガグツで乾杯を。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/nagagutsu.html",
        "slots_holiday": [12, 18, 20],
        "slots_weekday": [12, 18, 20],
    },
    # ── GOLD京都ポルタ（フレンチ酒場）。ぎふや天神と同じ food-only 方式 ──
    "goldporta": {
        "account": "goldporta",
        "store_name": "GOLD京都ポルタ",
        "handle": "@gold_kyotovolta",
        "region": "京都・ポルタ",           # 京都駅前ポルタ
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_goldporta",
        "folders": {
            "food": "1cN2-XeB3cah8Em96yTFwaDFh3zFLGqVZ",          # GOLD京都ポルタ「画像」フォルダ
            "music_uptempo": "1FgAPshzvZgtB4vMLrJfMOh2YGCWgEQuH",  # GOLD 音楽
            "music_normal": "1FgAPshzvZgtB4vMLrJfMOh2YGCWgEQuH",
        },
        "patterns": FOOD_ONLY_PATTERNS,   # 食材フォルダのみで完結＝他店フォルダ混入ゼロ
        # 「画像」配下の非料理サブフォルダは料理として使わない（ロゴ/外観内観/コース集合/ドリンク）。
        "exclude_cats": ["ロゴ", "外観", "内観", "音楽", "集合", "コース", "ドリンク", "飲み"],
        # 「画像」直下は フード/ドリンク… のサブフォルダ構成。fetch_typo を再帰収集モードに。
        "food_flat": True,
        "phrases_file": "phrases_goldporta.json",
        "fallback_phrase": "今宵は、GOLDでフレンチと一杯を。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/goldporta.html",
        "slots_holiday": [11, 18, 20],
        "slots_weekday": [11, 18, 20],
    },
}

# fetch_*.py が読む Drive フォルダ環境変数（未設定なら各スクリプトの既定＝三条）。
_FOLDER_ENV = {
    "food": "GENRE_FOOD_ID",
    "logo": "GENRE_LOGO_ID",
    "sake": "GENRE_SAKE_ID",
    "interior": "GENRE_INTERIOR_ID",
    "event": "GENRE_EVENT_ID",
    "music_normal": "GENRE_MUSIC_NORMAL_ID",
    "music_uptempo": "GENRE_MUSIC_UPTEMPO_ID",
}


def get_store(account=""):
    """account に対応する店舗設定を返す。未登録の非空 account は三条ベース＋接尾辞で最低限動く。"""
    account = (account or "").strip()
    base = dict(STORES[""])
    if not account:
        return base
    st = STORES.get(account)
    if st is None:
        st = dict(base)
        st.update({"account": account, "tab_suffix": "_" + account})
    return dict(st)


def apply_fetch_env(store):
    """店舗の Drive フォルダ＋文言ファイルを fetch_*.py / captions.py 用の環境変数に反映。
    account="" の三条では何も書き換えない＝従来動作を保証。"""
    folders = store.get("folders") or {}
    for key, env_name in _FOLDER_ENV.items():
        val = folders.get(key)
        if val:
            os.environ[env_name] = val
    # 店舗（非空account）だけキャプション文言・非料理カテゴリ除外を設定。三条は従来のまま。
    if store.get("account"):
        pf = store.get("phrases_file")
        if pf and os.path.exists(pf):
            os.environ["PHRASES_FILE"] = pf
        if store.get("fallback_phrase"):
            os.environ["STORE_FALLBACK_PHRASE"] = store["fallback_phrase"]
        excl = store.get("exclude_cats")
        if excl:
            os.environ["GENRE_EXCLUDE_CATS"] = ",".join(excl)
        if store.get("food_flat"):
            os.environ["GENRE_FOOD_FLAT"] = "1"


def render_props(store):
    """Remotion レンダリングに渡す店舗ブランド props（storeName/handle/region）。"""
    return {
        "storeName": store["store_name"],
        "handle": store["handle"],
        "region": store["region"],
    }


def app_tab(store, base="承認待ち"):
    """店舗別の承認待ちタブ名（三条＝無印）。"""
    return base + (store.get("tab_suffix") or "")
