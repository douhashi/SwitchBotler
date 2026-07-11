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

## 実 API で確認した構造（M2/M3・2026-07 時点）

実アカウントで疎通確認した構造のみ記載する（秘匿値・deviceId・deviceName は伏せる）。

### 封筒 / エンドポイント

- 共通封筒 `{ statusCode, message, body }`。成功は `statusCode: 100`。
  コマンド/シーン実行の body は `{}`。デバイスオフライン時は `statusCode: 161`（"device offline"）。
- `GET /devices` → `body.deviceList[]`（`deviceId` / `deviceName` / `deviceType` /
  `enableCloudService` / `hubDeviceId`。Hub 系は `enableCloudService` 無し）と
  `body.infraredRemoteList[]`（`deviceId` / `deviceName` / `remoteType` / `hubDeviceId`）。
- `GET /scenes` → `body` 直下が配列。要素は **`sceneId` / `sceneName` のみ**（説明・アイコンは無い）。

### deviceType 別 status body（`GET /devices/{id}/status`）

| deviceType | 主なフィールド |
|---|---|
| Plug / Plug Mini (JP) | `power`("on"/"off")（Plug Mini は +`voltage`/`weight`/`electricCurrent` 等） |
| Color Bulb | `power` / `brightness`(0-100) / `color`("R:G:B" 例 "255:142:65") / `colorTemperature` |
| Strip Light | `power` / `brightness` / `color`("R:G:B") |
| Bot | `power` / `battery` / `deviceMode` |
| Meter | `temperature`(float) / `humidity`(int) / `battery`(int) |
| Motion Sensor | `battery` / `moveDetected`(bool) / `brightness`("bright"/"dim") |
| Hub Mini | body は空 `{}` |

> Curtain（`slidePosition` / `calibrate` / `openDirection`）・Smart Lock（`lockState` /
> `doorState` / `battery`）・Humidifier（`power` / `humidity` / `nebulizationEfficiency` /
> `auto`）は**当アカウントに実機が無く**、mapping は公式 README 準拠（ハードウェア実行は未検証）。

### コマンド（`POST /devices/{id}/commands`）

- 形式: `{ command, parameter, commandType }`（`commandType: "command"`）。
- 確認済み: **Plug の `turnOn` / `turnOff` が `statusCode: 100`**（turnOn→turnOff の可逆サイクルで原状復帰を確認）。
- `setBrightness` は `parameter` に "0-100"、`setColor` は **`"R:G:B"`（コロン区切り）**。
  アプリは preset id を送り、Rust `mapping.rs` が `"R:G:B"` へ変換する。
- Curtain `setPosition`("0-100")、Smart Lock `lock`/`unlock`("default") は README 準拠（未検証）。
