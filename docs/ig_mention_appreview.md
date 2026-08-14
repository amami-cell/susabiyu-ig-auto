# Instagram ストーリーメンション自動リポスト：App Review 提出パッケージ

一般のお客様のメンションを受け取り／お礼DMを送るには、Metaアプリの **Advanced Access（アプリ審査）** が必要です。
このドキュメントは審査を通すための提出物・手順一式。コード側（受信・確認UI・リポスト投稿・お礼DM・店舗振り分け）は完成済み。

対象アプリ：**すさび湯三条ストーリー自動投稿**（App ID: 2298502903890085）
使用ユースケース：**Instagramでメッセージとコンテンツを管理**
申請する権限：**instagram_business_manage_messages**（メンション受信＋お礼DM）
※コンテンツ公開（自店ストーリー投稿）は既存トークンで稼働中。

---

## 0. 前提（先に済ませる）
- [ ] ビジネス認証（Business Verification）完了
- [ ] プライバシーポリシーの公開URL（下の必須項目を満たす）
- [ ] データ削除の導線（ポリシー内に記載 or データ削除コールバック）

## 1. 申請する権限
- `instagram_business_manage_messages` … ストーリーメンションの受信（story_mention）と、24時間以内のお礼DM返信。
- （既存で足りていれば）コンテンツ公開系は追加申請不要。**申請は実際に録画で見せる権限だけに絞る**（過剰申請は落ちる）。

## 2. 利用用途の説明（レビュアー向け・英語で提出）
> Our app is used solely by our own small izakaya restaurants — **ぎふや福岡天神 (@gifuya_fukuokatenjin)**
> and **すさび湯三条 (@susabiyu_sanjyo)** — to operate their **own** Instagram professional accounts.
> When a customer mentions one of our business accounts in their Instagram **Story**, we receive the
> `story_mention` event via the messaging webhook. Staff review the mention in our internal confirmation web app and then:
> (a) re-share it to **our own** Story with a short thank‑you caption, and/or
> (b) send a brief **thank‑you reply** to the customer within the standard 24‑hour window.
> We only process mentions **of our own account**, we never initiate messages to users who have not
> interacted with us first, and every post is **reviewed by a human** before publishing. This is used to
> thank customers and build community for a single small restaurant.

日本語（社内確認用の同旨）：
> お客様が当店のInstagramをストーリーでメンションした時に、その通知（story_mention）を受け取り、
> スタッフが社内の確認画面で内容を確認してから、当店のストーリーへお礼コメント付きでリポスト、
> または24時間以内にお礼DMを送ります。当店宛のメンションのみを処理し、こちらから未接触のユーザーに
> 送ることはありません。投稿前に必ず人が確認します。

## 3. スクリーンキャスト台本（審査提出の録画）
落ちる主因は「権限の使い所が録画で分からない」。次の流れを1本で撮る：
1. 別アカウント（テスター可）で **ストーリーに @当店をメンション** して投稿。
2. 社内確認Webアプリの **「💬 メンション」タブ** に、その投稿が入るところ。
3. スタッフが **お礼コメントを入力/選択**。
4. **「店ストーリーに追加」** → 当店ストーリーにリポストされるところ。
5. **「お礼DM」** → お客様に感謝DMが届くところ。
6. ナレーション：「当店宛メンションのみ・投稿前に人が確認・24h以内の返信」。

※このデモは開発モードのまま（自分/テスターのメンション）でも撮れます。まず1件テストして録画素材に。

## 4. プライバシーポリシーに必須の記載
- **取得データ**：メンションしたユーザーのIG表示名/ID、ストーリーメディア（一時取得）、メッセージ本文。
- **利用目的**：お礼の返信・当店ストーリーでの紹介（リポスト）。
- **保存/削除**：保存期間と、削除依頼の連絡先・方法。
- **第三者提供なし**／問い合わせ先。

## 5. 提出手順（Meta for Developers）
1. 対象アプリ → **アプリレビュー / 権限と機能**。
2. `instagram_business_manage_messages` の **Advanced Access** を「リクエスト」。
3. 用途説明（§2英語）・**スクリーンキャスト**（§3）・**プライバシーポリシーURL** を添付。
4. データ削除方法（ポリシー記載 or コールバック）を明記。
5. 送信 → 審査（数日〜数週間、修正依頼が来ることあり）。
6. 承認後、アプリを **Live** に切替 → 一般のお客様のメンションが届くようになる。

## 6. よくある却下理由（回避）
- 録画で権限の使い所が不明瞭 → §3の順序で明確に。
- ポリシーが無い/メッセージの扱いが書かれていない → §4を満たす。
- ビジネス認証未完了。
- 実演していない権限まで申請している → 申請は使う権限だけに絞る。

## 7. 承認後（コード側は変更不要）
- 受信口（GAS doPost）・確認UI（両店の「💬 メンション」）・リポスト投稿（mention_repost.py・15分おき）・
  お礼DM・店舗振り分け（ID内蔵）は稼働中。**Live化した瞬間から一般客で動く。**
- 動画メンションの文字焼き・即時投稿化・R2ホストは任意の後追い改善。
</content>
