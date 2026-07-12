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

## リフレッシュ方針（レート節約）

デバイス一覧の取得（IPC `list_devices`）は **1 + N リクエスト**を消費する
（`GET /devices` 1 回 + **status を持つデバイス**ごとの `GET /devices/{id}/status`。赤外線・
Hub 系は status を叩かないため N には含まれない）。1 日 10,000 リクエストの上限に対し、
トレイ popup の連続開閉のようなバーストでこれを繰り返すのは明確な浪費なので、
**自動リフレッシュ経路にのみ TTL ガード**を掛ける（正典は `src/stores/device-store.ts`）。

| 経路 | アクション | 挙動 |
|---|---|---|
| トレイ popup の focus 取得（`tray-app.tsx`）<br>メインウィンドウの `main-shown`（`App.tsx`） | `refreshIfStale()` | **TTL 内（`DEVICE_TTL_MS` = 30 秒）または取得進行中（in-flight）なら API を叩かず、キャッシュを表示する** |
| 手動更新ボタン / エラー再試行（`devices-view.tsx`） | `refresh()` | **TTL を無視して常に叩く**（ユーザーが明示的に最新化を意図した操作は必ず貫通させる） |
| 初回ロード（`load()`） | → `refresh()` | 未取得なら必ず叩く |

- `refresh(force?: boolean)` のような**フラグ引数にはしない**。`devices-view.tsx` が
  `onClick={refresh}` で渡しており、React が第 1 引数に MouseEvent を渡すため
  `force = MouseEvent`（truthy）という事故を招く。**意図を名前で表す 2 アクションに分ける**。
- **鮮度（`lastFetchedAt`）は取得に成功したときだけ更新する**。失敗をキャッシュして
  エラー状態に 30 秒閉じ込めない（次の自動リフレッシュが即再試行する）。

### TTL = 30 秒の根拠

TTL が実質的に規定するのは「**自アプリ以外の経路（物理スイッチ・SwitchBot アプリ・
オートメーション）で変えられた状態への追随遅延の上限**」だけである。自アプリの操作は
楽観更新と下記のキャッシュ無効化で常に整合するため、TTL 内でも表示は正しい。
30 秒は「一度閉じて開き直すまでの典型間隔を上回り、かつ他経路変更への追随として許容できる上限」。
センサー画面の 60 秒ポーリング（`SENSOR_POLL_MS`・`src/data/hooks.ts`）とは性質が異なる
（センサーは自動ポーリング、デバイスはユーザー起動）ため揃えない。

### 制御コマンド送信後の扱い（即時 refresh はしない）

コマンド成功時は **キャッシュを無効化するだけ**（`lastFetchedAt = null`）で、**即時の再取得はしない**。
次の自動リフレッシュ（popup を開く等）が TTL に阻まれず必ず最新化する。

- **即時 refresh を採らない理由**: (1) コマンドのたびに 1+N リクエストが新規発生し、TTL 導入の
  節約効果を打ち消す。(2) SwitchBot Cloud の status はコマンド直後に反映されないことがあり、
  **反映前の古い値で楽観更新を上書きしてトグルが「戻って見える」**。楽観更新パターンと矛盾する。
- **無効化する経路**: `setPower` の汎用経路（plug / light / curtain / lock / bot switchMode）と
  `commitControl`（brightness / color / position）の**成功時のみ**。失敗時は
  サーバ状態が変わっていないので無効化しない。
- **赤外線（aircon / ir_light）は無効化対象から除外する**。赤外線は **status エンドポイントを
  持たない**ため（後述）、refresh してもサーバから得られる新情報はゼロ。無効化すれば
  「何も学べない 1+N リクエスト」を次回表示時に誘発するだけで、レート節約の目的に反する。
  表示値の唯一のソースは永続化した最終送信値の重畳である。
- `nudgeBrightness` / `press` は状態を持たない momentary 操作なので無効化しない。

### 定期ポーリングは行わない

デバイス状態のバックグラウンド定期ポーリングは**採用しない**。常時ポーリングは誰も見ていない
時間帯にもレートを消費し続ける一方、本アプリの表示はユーザー起動（popup を開く / ウィンドウを表示）
であり、そのタイミングで取得すれば足りる。オフライン検知も同様に「コマンド結果から検知する
リアクティブ方式（方針 A）」を採る（常時監視しない）。センサー画面のみ、表示中に限り 60 秒
ポーリングする（別方針・`src/data/hooks.ts`）。

### TTL はウィンドウごとに独立（共有しない）

tray と main は別 webview = 別 JS コンテキスト = 別 zustand インスタンスであり、
**TTL タイムスタンプもウィンドウごとに独立する**。これを仕様として受け入れる
（既存の「各ウィンドウ独立ロード」= 決定4 と整合）。

- 重複コストの上限は「ウィンドウ数分（現状 tray / main の最大 2 回）の余分な 1+N」に留まり、
  連続開閉分は TTL で既に抑制済み。この残余を潰すために Rust 側へキャッシュ層・無効化 IPC・
  ウィンドウ間 emit を持ち込むのは、得られる数リクエスト/日に対して割に合わない（YAGNI）。
- **再考トリガー**（該当したら Rust 側キャッシュを Issue 化して検討する）:
  - 実利用で**レート制限を観測した**場合（HTTP 401 / `rateLimited`）
  - **ウィンドウ数が 3 以上**に増えた場合

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

#### センサー画面統合（Meter / Motion Sensor）

温湿度計（Meter 系）と人感センサー（Motion Sensor）は、デバイス一覧では従来どおり
`category_for` が `other`（読み取り表示）だが、**センサー画面には `is_sensor` 経由で並ぶ**。
`build_sensor_readings` が status body のフィールド有無で計測を積み分ける（数値は gauge、
状態は state）。

| deviceType | 計測（表示順） | 表現 |
|---|---|---|
| Meter 系 | 温度 / 湿度 / バッテリー | すべて gauge（0-100 メーター + 数値） |
| Motion Sensor | 人感（`moveDetected`）/ 明るさ（`brightness`）/ バッテリー | 人感・明るさは state（区分テキスト）、バッテリーは gauge |

- `moveDetected`(bool) → 「検知あり」/「検知なし」（検知は tone `active` で強調）。
- `brightness`("bright"/"dim") → 「明るい」/「暗い」（tone なし・ニュートラル）。
- `battery`(Integer) は 4 段階（`<10→10 / 10-20→20 / 20-60→60 / ≥60→100`）を
  そのまま 0-100 gauge に載せる（段階の明示表示はしない）。`version` は表示しない。

### コマンド（`POST /devices/{id}/commands`）

- 形式: `{ command, parameter, commandType }`（`commandType: "command"`）。
- 確認済み: **Plug の `turnOn` / `turnOff` が `statusCode: 100`**（turnOn→turnOff の可逆サイクルで原状復帰を確認）。
- `setBrightness` は `parameter` に "0-100"、`setColor` は **`"R:G:B"`（コロン区切り）**。
  アプリは preset id を送り、Rust `mapping.rs` が `"R:G:B"` へ変換する。
- Curtain `setPosition`("0-100")、Smart Lock `lock`/`unlock`("default") は README 準拠（未検証）。

### デバイスオフライン検知（封筒 statusCode 161）

デバイスがオフライン（クラウド未到達）の状態でコマンド/status を叩くと、封筒 `statusCode` が
**161**（"device offline"）で返る。これを検知して該当デバイスの操作 UI をグレーアウト・無効化し、
操作試行時にトーストで理由を示す。**Webhook 常時監視ではなく、コマンド送信の結果から検知する
リアクティブ方式**（方針 A）を採る（常時ポーリング/購読はしない）。

- **Rust（共通層）**: `client.rs` の `request_json` が封筒 `statusCode` を検査する。`100`=成功、
  **`161`→`SwitchBotError::offline()`（`ErrorCode::Offline`）**、それ以外の非 100 は従来どおり
  `api_status(code)`（`ErrorCode::ApiStatus`）にマップする。`ErrorCode::Offline` の serde camelCase
  出力は `"offline"`。メッセージは「デバイスがオフラインのため操作できません。」で、**deviceId・
  デバイス名・秘匿値は含めない**（他のエラーと同じ安全文言方針）。
- **フロント（境界）**: `src/data/ipc.ts` の `toError` が Rust の `{ code, message }` を `code` 付きの
  `AppError` に変換し、`isOfflineError(error)`（`error.code === "offline"`）で判定する。
- **フロント（状態）**: `device-store` が一時フラグ `offlineIds: Set<string>` を持つ。操作失敗時の
  共通ヘルパ `failOperation` が、`isOfflineError` なら該当 id を `offlineIds` に加える。`Device` 型
  自体にはオフライン属性を**付与しない**（`devices`/`loading`/`error` と同じ横断的な一時状態）。
- **クリア（方針 A）**: `refresh`（更新）の開始時・成功時に `offlineIds` を空へリセットする。オフライン
  印は次回操作で 161 が再発すれば再度付く（リアクティブ）。
- **UI**: 一覧カード・詳細・トレイの操作 UI を `disabled` + `aria-disabled` + `pointer-events-none` で
  無効化し、`opacity` を下げてグレーアウトする。色だけに頼らず「オフライン」表記を必ず併記する
  （一覧サブ行・右端ピル、詳細 hero のインライン表記、トレイの小ラベル。視覚仕様の正典は
  `docs/mockup/index.html` 画面01 `.device.offline`）。ピン留めは操作可のまま。
- 実疎通は `src-tauri/src/switchbot/mod.rs` の #[ignore] テスト `offline_device_maps_to_offline_error`
  で確認できる（`infisical run --env=dev -- cargo test -- --ignored`。電源トグル可能な各機に
  「現在の電源状態と同じ冪等コマンド」を送り、オフライン機があれば `ErrorCode::Offline` を検知して
  `error code = Offline` のみ出力。deviceId・名称・封筒本文は伏せる）。**オフライン機が無い環境では
  スキップされる**（161 は実機の状態依存で任意発生させられないため）。

### Bot（動作モードに応じた操作）

Bot は物理ボタンを押すデバイスで、SwitchBot アプリ側の設定により **動作モード（`deviceMode`）**
が変わる。status body は `power`("on"/"off") / `battery` / `deviceMode` を返す。

| deviceMode（status 値） | 正規化（`botMode`） | UI | 送信コマンド |
|---|---|---|---|
| `pressMode` | `press` | 「押す」ボタン（momentary） | `press` |
| `switchMode` | `switch` | ON/OFF トグル | `turnOn` / `turnOff` |
| `customizeMode` | `customize` | ON/OFF トグル（**公式準拠・ハードウェア未検証**） | `turnOn` / `turnOff` |
| 欠損 / 未知値 | （なし・None） | ON/OFF トグル（フォールバック） | `turnOn` / `turnOff` |

- コマンドはいずれも `parameter: "default"` / `commandType: "command"`。

| command | parameter | commandType |
|---|---|---|
| `turnOn` / `turnOff` | `default` | `command` |
| `press` | `default` | `command` |

- `deviceMode` の正規化（`pressMode`→`press` 等）は Rust `mapping.rs`（`bot_mode`）が所有し、
  `ControlsDto.botMode`（camelCase シリアライズ）でフロントに渡す。未知値・欠損は `None` にして
  フロントは従来のトグル扱いにフォールバックする（PO 論点4）。
- `press` は既存の汎用 `send_command` 経路（`{command:"press", parameter:"default", commandType:"command"}`）で送る。
  press 専用の IPC は設けない。
- **customizeMode**: 既存 ON/OFF トグル（turnOn/turnOff）を流用する。`botMode="customize"` として
  3 値正規化で保持（"customize" を捨てない）するが、実機での動作は未検証（公式 README 準拠）。
  customize 専用コマンド経路は作らない（YAGNI・実機検証不能のため。PO 論点1）。
- 実疎通は `src-tauri/src/switchbot/mod.rs` の #[ignore] テスト `send_bot_press_succeeds` で
  `infisical run --env=dev -- cargo test -- --ignored` により確認できる（一覧から `category=="bot"` を
  取得し `botMode` を出力、pressMode の Bot に `press` を 1 回送って `statusCode 100` を確認）。
  **press は実機を物理的に 1 回動作させる副作用がある**（不可逆・原状復帰しない）。本サンドボックスでは
  Infisical 非対話ログイン不可のため未実行（QA/実行者が実施）。

### 赤外線（仮想）デバイス — エアコン（Air Conditioner）

赤外線リモコンは `body.infraredRemoteList[]` に載り、**status エンドポイントを持たない**
（`GET /devices/{id}/status` の対象外）。そのため一覧取得時に status は叩かず、
表示値は「最後に送信した値」をローカル（plugin-store）に永続保持したものを唯一のソースとする。

エアコンは公式 README「Command set for virtual infrared remote devices」の **`setAll`**
（温度・モード・風量・電源を一括送信）で操作する。赤外線は状態を返さないため turnOn/turnOff は
使わず、常に全状態を setAll で同送する。

- 形式: `{ "command": "setAll", "parameter": "{temperature},{mode},{fan speed},{power state}", "commandType": "command" }`
- 例: `"26,1,3,on"`

| パラメータ | 値 |
|---|---|
| temperature | 摂氏の整数（アプリの UI は 16–30℃ 固定） |
| mode | `0`/`1`=auto, `2`=cool, `3`=dry, `4`=fan, `5`=heat（auto は 1 を送る） |
| fan speed | `1`=auto, `2`=low, `3`=medium, `4`=high |
| power state | `on` / `off` |

- アプリは意味論（mode="cool" / fanSpeed="high"）だけを扱い、数値エンコードと parameter 文字列の
  組み立ては Rust `mapping.rs`（`aircon_parameter`）が所有する（決定1。setColor と同型）。
- `remoteType` の実値（`"Air Conditioner"` か `"DIY Air Conditioner"` か）は**実 API 未確認**のため
  両対応でマッピングする（Curtain/Lock/Humidifier と同じ「README 準拠・ハードウェア未検証」方針）。
  実疎通は `src-tauri/src/switchbot/mod.rs` の #[ignore] テスト `send_aircon_succeeds` で
  `infisical run --env=dev -- cargo test -- --ignored` により確認できる（本サンドボックスでは
  Infisical 非対話ログイン不可のため未実行。`.tmp/spira-evidence/V1-V2-aircon-real-api.md` 参照）。

### 赤外線（仮想）デバイス — ライト（Light / DIY Light）

赤外線ライトもエアコン同様 `body.infraredRemoteList[]` に載り、**status エンドポイントを持たない**。
表示値（電源）は「最後に送信した電源値」をローカル（plugin-store `irLightStates`）に永続保持したものを
唯一のソースとし、device-store が refresh 時に controls へ重畳する（エアコンと同一の overlay パターン）。

ライトは公式 README「Command set for virtual infrared remote devices」の**標準コマンド**で操作する。
Light は**絶対的な明るさ値・状態を持たず**、電源（turnOn/turnOff）と**相対的な明暗**
（brightnessUp/brightnessDown）のみを扱う。UI は明るさスライダではなく「明るく／暗く」の
モーメンタリボタン（相対アクション）で提供する（既存の brightness スライダ経路とは実装を分離。決定）。

| 対象 | commandType | command | parameter |
|---|---|---|---|
| すべての家電種別 | `command` | `turnOn` / `turnOff` | `default` |
| Light | `command` | `brightnessUp` / `brightnessDown` | `default` |
| Others（学習リモコン） | `customize` | {ユーザ定義ボタン名} | `default` |

- 形式: `{ "command": "turnOn" | "turnOff" | "brightnessUp" | "brightnessDown", "parameter": "default", "commandType": "command" }`
- アプリは action（`"on"`/`"off"`/`"brighter"`/`"dimmer"`）だけを扱い、SwitchBot コマンド名への変換は
  Rust `mapping.rs`（`ir_light_command`）が所有する（決定1。setColor/setAll と同型）。
- `Light` と `DIY Light` を共に `ir_light`（同一の**標準コマンド経路**）へ二重マッピングする
  （PO 論点1: (A)。エアコンが AC/DIY AC を同一経路にした前例に倣う）。`remoteType` の実値は
  **実 API 未確認**のため両対応。
- **DIY の未検証点**: `DIY Light` が標準コマンド（turnOn/turnOff/brightnessUp/Down）に応答するかは
  実機（V3）で確認する。応答するなら `customize`（ユーザ定義ボタン）経路は作らない（本 Issue スコープ外）。
  実疎通は `src-tauri/src/switchbot/mod.rs` の #[ignore] テスト `send_ir_light_succeeds` で
  `infisical run --env=dev -- cargo test -- --ignored` により確認できる（DIY Light にも同コマンドを送る。
  本サンドボックスでは Infisical 非対話ログイン不可のため未実行。
  `.tmp/spira-evidence/V1-V2-ir-light-real-api.md` 参照）。
