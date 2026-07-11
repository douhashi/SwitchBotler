# SwitchBot API の要点

SwitchBotler が利用する SwitchBot Cloud API v1.1 の仕様メモ。**このページは要約であり、常に公式ドキュメントが正典**。

## 公式ドキュメント（正典）

- **SwitchBot Open API（v1.1）**: <https://github.com/OpenWonderLabs/SwitchBotAPI>
  - リポジトリ: `OpenWonderLabs/SwitchBotAPI`（"SwitchBot Open API Documents"）。現行 `README.md` が v1.1、旧版は `README-v1.0.md`。
- **Webhook / デバイス別コマンド仕様など**は上記 README を参照。

## 実装ルール（必読）

外部境界（SwitchBot API）を扱う実装・モックは、次を厳守する（[philosophy.md](./philosophy.md) 「外部境界の正しさはモックで担保しない」参照）:

- **想像で実装しない**。エンドポイント・パラメータ・レスポンス形・デバイス種別ごとのコマンドは、必ず上記**公式ドキュメントを参照**して確定する。
- **モック / スタブを作る場合も、実際に API へアクセスして確かめる**。実レスポンスと突き合わせ、リクエスト/レスポンスのログ等の**疎通証拠を残す**（Token/Secret/署名は伏せる）。
- 完全モックの単体テストが通っただけでは「完了」としない。
- 仕様が不明な点は憶測で埋めず、公式ドキュメント該当箇所へのリンクを残して判断根拠を明示する。

## 基本情報

- **ベース URL**: `https://api.switch-bot.com/v1.1/`
- **認証情報の取得**: SwitchBot アプリ → プロフィール → 設定 → 開発者向けオプション で Token / Secret を発行
- **レート制限**: 1 トークンあたり **1 日 10,000 リクエスト**（超過で HTTP 401）

## 認証（各リクエストのヘッダー）

すべてのリクエストに以下のヘッダーを付与する。

| ヘッダー | 内容 |
|---|---|
| `Authorization` | token |
| `sign` | `HMAC-SHA256(token + t + nonce, secret)` を Base64 → **大文字化** |
| `t` | 13 桁のミリ秒タイムスタンプ |
| `nonce` | ランダムな UUID |
| `Content-Type` | `application/json` |

### 署名生成の手順

1. 署名対象文字列を `token + t + nonce` の連結で作る。
2. `secret` を鍵として HMAC-SHA256 でハッシュ化する。
3. 結果を Base64 エンコードする。
4. **Base64 文字列を大文字化する**（この最終ステップに注意）。

> 署名生成・タイムスタンプ・nonce 発行はすべて Rust バックエンド側で行う。フロントエンドには秘匿情報を渡さない。

## 主なエンドポイント

| 用途 | メソッド / パス |
|---|---|
| デバイス一覧取得 | `GET /v1.1/devices` |
| デバイス状態取得 | `GET /v1.1/devices/{deviceId}/status` |
| コマンド送信 | `POST /v1.1/devices/{deviceId}/commands` |
| シーン一覧 | `GET /v1.1/scenes` |
| シーン実行 | `POST /v1.1/scenes/{sceneId}/execute` |
| Webhook 設定 | `POST /v1.1/webhook/...` |
