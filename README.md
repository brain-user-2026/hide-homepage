# Open Newstages AI

Netlifyで公開している静的ホームページです。AI・IT支援サービスの紹介、会社情報、お問い合わせ導線を掲載しています。

## 公開URL

https://open-newstages-ai.com

## 構成

- `index.html`: トップページ
- `about.html`: 会社概要
- `service.html`: サービス紹介
- `company.html`: 会社情報
- `contact.html`: お問い合わせ
- `assets/css/style.css`: 共通スタイル
- `assets/js/main.js`: ナビゲーションなどの共通JavaScript
- `assets/`: 画像・CSS・JavaScript

## デプロイ

GitHubの `main` ブランチに変更を反映すると、Netlifyへ自動デプロイされます。

## 編集ルール

- 既存デザインのトーンを大きく変えず、色・余白・角丸・カード表現をそろえる
- 日本語サイトとして自然で読みやすい文章にする
- モバイル表示ではテキストの折り返し、ナビゲーション、カード幅を確認する
- Google Workspace / Netlify / GitHub の設定は勝手に変更しない
- `netlify.toml` のセキュリティヘッダーは維持する
- 変更前に目的を明確にし、対象ファイルを絞って編集する
