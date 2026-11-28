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
    # 洋食おしゃれ10種（region非依存・theme配色・fetch_typoの食材写真のみで完結）
    "yoshokudish", "yoshokuchalk", "yoshokusizzle", "yoshokumag", "yoshokucine",
    "yoshokuwine", "yoshokutrio", "yoshokupola", "yoshokutype", "yoshokuopen",
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

# 洋食（イタリアン/フレンチ）向けの"おしゃれ"テンプレ集合。和の暖簾/短冊は使わず、
# 上品なセリフ×余白×金or生成りの縁取りで料理写真を主役にする（theme で配色切替）。
# food-only（食材フォルダのみ）で完結＝他店フォルダ混入ゼロ。
YOSHOKU_PATTERNS = [
    "yoshokudish",    # ①本日の一皿（主役写真＋上品セリフ）
    "yoshokuchalk",   # ②黒板トラットリア（黒板×チョーク）
    "yoshokusizzle",  # ③鉄板ジュ〜っと（肉・湯気パーティクル）
    "yoshokumag",     # ④雑誌エディトリアル（縦組み見出し）
    "yoshokucine",    # ⑤シネマ・フルスクリーン（レターボックス）
    "yoshokuwine",    # ⑥ワインと共に（2枚ペアリング）
    "yoshokutrio",    # ⑦おすすめ3品スライド（01/02/03）
    "yoshokupola",    # ⑧ポラロイド重ね（4枚シェア感）
    "yoshokutype",    # ⑨大見出しタイポ（超特大の一言）
    "yoshokuopen",    # ⑩本日OPEN案内（集客・予約導線）
    "yoshokumagazine",# ⑪雑誌ストーリー（表紙〜裏表紙まで紙の誌面で統一）
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
        # 営業時間。入力用スプレッドシートから読めなかった時のフォールバック（店舗受付シート ナガグツ行より）。
        # シート側に記載があればそちらが優先される。
        "hours": "11:30〜24:00",
        "region": "梅田・堂山町",          # 店舗受付（記入用）シートのエリア＝梅田・堂山町（大阪）
        "theme": "italian",              # 洋食おしゃれテンプレの配色（イタリアン＝温かみ生成り）
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_nagagutsu",
        "folders": {
            "food": "198v4GTeAMNbQJrSikPpQtFe314eUjBJU",          # ナガグツ「画像」フォルダ
            "music_uptempo": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",  # ナガグツ 音楽
            "music_normal": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",
        },
        "patterns": YOSHOKU_PATTERNS,     # 洋食おしゃれテンプレのみ（和の大衆テンプレは使わない）
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
    # ── ARATA（大阪・梅田）。ナガグツ方式の洋食おしゃれテンプレ。※料理写真の投入待ち（ロゴは有り）──
    "arata": {
        "account": "arata",
        "store_name": "ARATA",
        "handle": "@arata_umeda",
        "region": "大阪・梅田",
        "theme": "italian",               # ナガグツと同じ温かみ生成り（とりあえず。業態確定後に調整可）
        "sheet_id": SANJO_SHEET_ID,
        "tab_suffix": "_arata",
        "folders": {
            "food": "1pW7KYmF2GCp7gp_lfubuFU_NcUwdXlvx",         # 「ARATA 画像」（CI読取可／ロゴは配下ロゴフォルダ。料理写真は投入待ち）
            "music_uptempo": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",  # 音楽はナガグツと共用
            "music_normal": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",
        },
        "patterns": YOSHOKU_PATTERNS,
        "exclude_cats": ["ロゴ", "外観", "内観", "音楽", "集合", "コース", "ドリンク", "飲み"],
        "food_flat": True,
        "phrases_file": "phrases_arata.json",
        "fallback_phrase": "今宵は、ARATAで一杯を。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/arata.html",
        "slots_holiday": [11, 18, 20],
        "slots_weekday": [11, 18, 20],
    },
    # ── CRAFTMAN UMAMI（中崎町／クラフトビール・ビストロ）。ナガグツ方式。※料理写真の投入待ち（ロゴは有り）──
    "umami": {
        "account": "umami",
        "store_name": "CRAFTMAN UMAMI",
        "handle": "@craftman_umami",
        "region": "中崎町",
        "theme": "italian",               # 温かみ生成り（とりあえず。確定後に調整可）
        "sheet_id": SANJO_SHEET_ID,
        "tab_suffix": "_umami",
        "folders": {
            "food": "1-y6UxIoQ0qO2u5udvq5rr8J-NmNFBzOb",         # 「CRAFTMAN UMAMI 画像」（CI読取可／料理写真は投入待ち）
            "music_uptempo": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",
            "music_normal": "1t0WsEon0ZGzB1q_C_U7CtVF_0303G2l0",
        },
        "patterns": YOSHOKU_PATTERNS,
        "exclude_cats": ["ロゴ", "外観", "内観", "音楽", "集合", "コース", "ドリンク", "飲み"],
        "food_flat": True,
        "phrases_file": "phrases_umami.json",
        "fallback_phrase": "今宵は、UMAMIでクラフトビールを。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/umami.html",
        "slots_holiday": [11, 18, 20],
        "slots_weekday": [11, 18, 20],
    },
    # ── GOLD京都ポルタ（フレンチ酒場）。ぎふや天神と同じ food-only 方式 ──
    "goldporta": {
        "account": "goldporta",
        "store_name": "GOLD京都ポルタ",
        "handle": "@gold_kyotoporta",
        "region": "京都・ポルタ",           # 京都駅前ポルタ
        "theme": "french",               # 洋食おしゃれテンプレの配色（フレンチ＝黒×金＝GOLD）
        "logo_color": True,               # ロゴは白黒化せず「色付きのまま」使用（ユーザー要望）
        # 丸ロゴのファイル名ヒント（ユーザー明示：GOLDの gold_ロゴ2 / gold_ロゴ4 が丸ロゴ）。
        # これで OP/CLOSE のエンブレムが横ワードマーク（文字ロゴ）に化けるのを防ぐ。
        "round_logo_names": ["ロゴ2", "ロゴ4", "ロゴ２", "ロゴ４"],
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_goldporta",
        "folders": {
            "food": "1cN2-XeB3cah8Em96yTFwaDFh3zFLGqVZ",          # GOLD京都ポルタ「画像」フォルダ
            # GOLD専用の音楽フォルダ「GOLD京都ポルタ 音楽」（サービスアカウント所有＝CIが読める）。
            # 配下は アップテンポ/ノーマル のサブフォルダ構成。親を指定して再帰収集で全曲を拾う
            # （曲はナガグツと同一なので、この切替で動画の再レンダは不要）。
            "music_uptempo": "1FgAPshzvZgtB4vMLrJfMOh2YGCWgEQuH",  # GOLD京都ポルタ 音楽（親）
            "music_normal": "1FgAPshzvZgtB4vMLrJfMOh2YGCWgEQuH",
        },
        "patterns": YOSHOKU_PATTERNS,     # 洋食おしゃれテンプレのみ（和の大衆テンプレは使わない）
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
    # ── 鮨処すさび湯（京都・四条烏丸／寿司・日本料理）。GOLDと同じ food-only 方式・和モダン意匠 ──
    "karasuma": {
        "account": "karasuma",
        "store_name": "鮨処すさび湯",
        "handle": "@susabiyu_kyoto",
        "region": "京都・四条烏丸",
        "theme": "wamodan",              # 和モダン配色（墨×生成り×漆金／差し色=弁柄）
        # ロゴは生成り化した白ワードマークを暗い和モダン地に載せる＝logo_colorは付けない。
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_karasuma",
        "folders": {
            "food": "1EuoC6HqqJS12cKXOsS-W8K5mzcU4lLR6",          # 鮨処すさび湯「画像」フォルダ
            # 音楽フォルダ（アップテンポ/ノーマルのサブ構成。親を指定して再帰収集）。
            "music_uptempo": "158tb3KZE8bjtBGz-8Y8RzbAWPt-daIY7",
            "music_normal": "158tb3KZE8bjtBGz-8Y8RzbAWPt-daIY7",
        },
        # 和モダン専用テンプレ（tatewa=縦書き大明朝／magwa=和スタイリッシュ雑誌）を先頭に、
        # 相性の良い色替えテンプレを続ける。黒板(chalk)と洋食の雑誌2種(mag/magazine)は不使用。
        # 文字中心(type=大見出しタイポ／open=OPEN案内)は不要＝写真主役のみ（ユーザー指定）。
        "patterns": ["yoshokutatewa", "yoshokumagwa", "yoshokuhitowa", "yoshokudish",
                     "yoshokusizzle", "yoshokucine", "yoshokuwine", "yoshokutrio",
                     "yoshokupola"],
        # 「画像」配下の非料理サブフォルダは料理として使わない。
        "exclude_cats": ["ロゴ", "外観", "内観", "音楽", "集合", "コース", "ドリンク", "飲み"],
        "food_flat": True,                # 「画像」直下は フード/ドリンク… のサブ構成＝再帰収集
        "phrases_file": "phrases_karasuma.json",
        "fallback_phrase": "今宵は、鮨処すさび湯で旬を一献。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/karasuma.html",
        "slots_holiday": [11, 18, 20],
        "slots_weekday": [11, 18, 20],
    },
    # ── 大衆食堂 こまつ原（大阪・梅田小松原／居酒屋・食堂・大衆酒場）。ぎふや天神と同じ和の大衆 food-only 方式 ──
    "komatsubara": {
        "account": "komatsubara",
        "store_name": "大衆食堂 こまつ原",
        "handle": "@taisyuusyokudo.komatsubara",
        # フィード焼き込みのラテン表記（既定はナガグツの "MEAT BAR"／"NAGAGUTSU · MEAT BAR"）。
        #   他店表記がこまつ原のフィードに出ないよう、必ず自店の表記で上書きする。
        # フィードは「ぎふや型」に寄せる（全面写真＋縦大料理名＋赤下線＋赤リボン・gifuya_design）。
        #   ストーリーは元からぎふやと同一コンポーネント＝これでフィードも体裁が揃う。
        "feed_style": "gifuya",
        "feed_ribbon": "梅田",                     # 右上の赤短冊リボン（ぎふやの「福岡天神店」に相当）
        "feed_ribbon_size": 84,                    # 「梅田」2文字は既定50だと小さいので大きめに
        # ↓ YoshokuFeed(ナガグツ型)用の表記。feed_style=gifuya では未使用だが、
        #   将来ナガグツ型へ戻す場合に備えて残置（他店名の既定焼き込みを防ぐ値）。
        "feed_kicker": "TAISHU SHOKUDO",          # 屋号下の小さなキッカー（ヘッダー型A/B/C案）
        "rail_label": "KOMATSUBARA · UMEDA",      # 左サイドレールの縦書きラベル（E案）
        # 本番画像（こまつ原のファイル名）が Drive に投入済み（2026-11）。料理名はファイル名そのまま
        #   クリーン（他店名を含まない）ため、name_strip は不要＝削除済み。
        # 営業時間。入力用スプレッドシートから読めなかった時のフォールバック（店舗受付シート こまつ原行より）。
        "hours": "11:30〜23:00",
        "region": "梅田・小松原",          # 店舗受付（記入用）シートのエリア＝梅田・小松原（大阪）
        "region_scale": 1.6,               # ストーリーの地名「梅田・小松原」を大きく（ユーザー要望）
        "dish_name_size": 30,              # 縦書き料理名を縮小（短冊/お品書きで大きすぎ・はみ出し対策）
        "dish_name_wrap": 5,               # 5文字超の料理名は縦2列へ折り返し（下まで伸びて切れるのを防ぐ）
        "sheet_id": SANJO_SHEET_ID,       # 同一スプレッドシートを接尾辞タブで共用
        "tab_suffix": "_komatsubara",
        "folders": {
            # 画像＝こまつ原 本番フォルダ「画像データ（大衆食堂 こまつ原）」。配下は
            #   小松原フード → カテゴリ（ランチ・コース/名物/麺/焼鳥・串…）→ 料理写真 の2階層ネスト。
            #   food_flat=True の再帰収集でカテゴリ名＝直上フォルダ名として拾える。
            "food": "1HyHZs6VWjBoyFQWlJhxu1_l6P4OATOWn",          # こまつ原 本番「画像」フォルダ
            # 音楽＝こまつ原 本番フォルダ「音楽データ（大衆食堂 こまつ原）」= 1iVeGiJQmGf0oQBYJPq_AktvpZ98ib_cl
            #   だが現在オーナー未投入で空のため、BGMだけ暫定でぎふやを間借り（無音ストーリー回避）。
            #   こまつ原の曲が入ったら上記IDへ差し替える。
            "music_uptempo": "1pk6Lq_TKK4MRWLYRowOjjRRFUfBbyYh_",  # 暫定：ぎふや BGM（こまつ原音楽が空のため）
            "music_normal": "1pk6Lq_TKK4MRWLYRowOjjRRFUfBbyYh_",
        },
        "patterns": FOOD_ONLY_PATTERNS,   # 和の大衆テンプレ（食材フォルダのみで完結＝他店フォルダ混入ゼロ）
        # 「画像」配下の非料理サブフォルダは料理として使わない（ロゴ/外観内観/音楽/集合/ドリンク）。
        #   ※「コース」は除外に入れない：こまつ原の料理カテゴリ「ランチ・コース」が部分一致で
        #     丸ごと消える（_excluded は部分一致判定）のを防ぐため。コース集合写真の単独フォルダは無い。
        # ★ぎふや由来の混入写真を除外（オーナーがこまつ原フォルダに誤投入した「どぶ漬け串カツ/
        #   チョリカツ/どぶ漬けチーズチキンカツ」等＝ぎふや天神の看板メニュー。こまつ原には無い）。
        #   _walk はファイル名にも部分一致で効くため、料理名の一部でピンポイント除外できる。
        #   （全料理名を確認し誤爆ゼロ：これら3語は該当5点＝どぶ漬け串カツ牛/豚・どぶ漬けチーズ
        #    チキンカツ・小鉢定食どぶ漬けチーズチキンカツ・チョリカツ のみに一致）。
        "exclude_cats": ["ロゴ", "外観", "内観", "音楽", "集合", "ドリンク", "飲み",
                         "どぶ漬け", "チョリカツ", "串カツ"],
        "food_flat": True,                # 「画像」直下は 小松原フード→カテゴリ のネスト＝再帰収集
        "phrases_file": "phrases_komatsubara.json",
        "fallback_phrase": "昼サケ、夜メシ。梅田・こまつ原で。",
        "pwa_url": "https://amami-cell.github.io/susabiyu-media/app/komatsubara.html",
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
        rln = store.get("round_logo_names")
        if rln:
            os.environ["GENRE_LOGO_ROUND_NAMES"] = ",".join(rln)


def strip_brand(name, store):
    """借り物写真の料理名から他店ブランド語を除去する（store["name_strip"] の各パターン）。
    例：こまつ原がぎふや写真を間借り中、「ぎふやの明太出汁巻き」→「明太出汁巻き」。
    name_strip 未設定の店は一切変えない（＝既存店に無影響）。除去で空になったら元名を返す。"""
    pats = store.get("name_strip") or []
    if not pats:
        return name
    import re as _re
    s = str(name or "")
    for p in pats:
        s = _re.sub(p, "", s)
    s = _re.sub(r"[ 　]{2,}", "　", s).strip(" 　・-")
    return s or str(name or "")


def render_props(store):
    """Remotion レンダリングに渡す店舗ブランド props（storeName/handle/region/theme）。
    theme は洋食おしゃれテンプレ(YoshokuDish等)の配色切替に使う（italian/french 等・空=既定）。"""
    return {
        "storeName": store["store_name"],
        "handle": store["handle"],
        "region": store["region"],
        "theme": store.get("theme", ""),
        # 地名(region)のフォント倍率。既定1＝他店は従来どおり。長い/小さい地名の店だけ大きくする。
        "regionScale": store.get("region_scale", 1),
        # 縦書き料理名（短冊/お品書き）のフォントpxと、2列折り返しの閾値（文字数）。
        #   既定 40 / 0（=折り返さない）＝他店は従来どおり。長い料理名の店だけ縮小＋折返しする。
        "nameSize": store.get("dish_name_size", 40),
        "nameWrap": store.get("dish_name_wrap", 0),
    }


def app_tab(store, base="承認待ち"):
    """店舗別の承認待ちタブ名（三条＝無印）。"""
    return base + (store.get("tab_suffix") or "")
