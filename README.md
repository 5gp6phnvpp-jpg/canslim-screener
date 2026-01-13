# CANSLIM 日本株スクリーナー

CANSLIM投資法に基づいて日本株をスクリーニングし、ブレイクアウト間近・買いゾーン内の銘柄をLINEで通知するツールです。

## 機能

### CANSLIM要素（自動分析）
- **M** - マーケットの方向性（TOPIX/日経225の50日MA、ディストリビューションデイ）
- **S** - 需給（50日EMAフィルター、出来高140%確認）
- **N** - 新高値（52週高値判定）
- **L** - 業種リーダー（業種ランキングTOP20、業種内RS）

### チャートパターン
- **カップ・ウィズ・ハンドル** - ピボットポイント、買いゾーン（ピボット+5%）判定

### 出力
- 📱 LINE通知（Flex Message形式）
- 📊 JSONレポート保存
- 🌐 Webダッシュボード（予定）

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd stock-screener
npm install
```

### 2. 環境変数の設定

以下の環境変数を設定してください：

```bash
# J-Quants API V2（APIキー方式）
export JQUANTS_API_TOKEN="your_api_key"

# LINE Messaging API（通知）
export LINE_CHANNEL_TOKEN="your_channel_access_token"
export LINE_USER_ID="your_user_id"
```

**J-Quants APIキーの取得:**
1. https://jpx-jquants.com/ にログイン
2. 設定 → APIキー から取得

### 3. ローカル実行

```bash
npm run screen
```

## GitHub Actionsで自動実行

### シークレットの設定

リポジトリの Settings → Secrets and variables → Actions で以下を設定：

- `JQUANTS_API_TOKEN`
- `LINE_CHANNEL_TOKEN`
- `LINE_USER_ID`

### 実行スケジュール

- 毎週月〜金曜日 18:00 JST に自動実行
- 手動実行も可能（Actions → Run workflow）

## ディレクトリ構造

```
stock-screener/
├── .github/workflows/      # GitHub Actions
├── src/
│   ├── data/               # データ取得
│   ├── analysis/
│   │   ├── canslim/        # M/S/N/L分析
│   │   └── chartPatterns/  # パターン検出
│   ├── notify/             # LINE通知
│   ├── screener.js         # スクリーニングエンジン
│   └── main.js             # エントリーポイント
├── data/                   # キャッシュデータ
├── reports/                # 日次レポート
└── docs/                   # Webダッシュボード
```

## シグナルの意味

| シグナル | 意味 |
|---------|------|
| 🔴 BREAKOUT | ピボット突破、買いゾーン内、出来高確認済み |
| 🟡 APPROACHING | ピボットまで2%以内 |
| 🟢 FORMING | パターン形成中、ウォッチリスト候補 |
| ⚫ EXTENDED | 買いゾーン超過、様子見推奨 |

## 注意事項

- このツールは投資助言ではありません
- 投資判断は自己責任でお願いします
- C/A/I要素は手動で確認してください
