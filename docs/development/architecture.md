# 技術構成 / アーキテクチャ

新規デスクトップアプリの 2026 年時点でのデファクトに沿い、**Tauri v2** を採用する。SwitchBotler は軽量なトレイ常駐ユーティリティであり、業界的にも「開発ツール・内部ユーティリティは Tauri 優先」という位置づけと合致する。

## スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| アプリ基盤 | **Tauri v2** | バンドル 3〜10MB・低メモリ・トレイ常駐向き・将来モバイル対応可 |
| バックエンド | **Rust** | 署名生成と API 呼び出しをネイティブ側で完結（CORS 回避・秘匿情報保護） |
| フロントエンド | **React 19 + TypeScript** | エコシステムが厚く、既存スキルと親和 |
| ビルド | **Vite** | Tauri 標準・高速 HMR |
| スタイリング | **Tailwind CSS v4** | 素早く UI 構築（`@tailwindcss/vite` プラグイン方式） |
| UIコンポーネント | **shadcn/ui**（Radix UI） | アクセシビリティ・キーボード操作を担保。見た目は Soft Depth トークンで上書き |
| アイコン | **Lucide**（`lucide-react`） | 一貫したアイコンパック。手書き SVG・絵文字を使わない |
| 状態管理 | **Zustand** | 軽量・ボイラープレート少 |

> デザイン方針の詳細は [`design-system/MASTER.md`](../../design-system/MASTER.md)、画面モックアップは [`docs/mockup/`](../mockup/) を参照。

## アーキテクチャ方針

```
┌─────────────────────────────────────────┐
│  React + TS (WebView フロントエンド)      │
│   - デバイス一覧 / 操作UI / 設定画面       │
└────────────────┬────────────────────────┘
                 │  invoke (Tauri IPC)
┌────────────────▼────────────────────────┐
│  Rust バックエンド (src-tauri)            │
│   - HMAC-SHA256 署名生成                  │
│   - SwitchBot API への HTTPS リクエスト   │
│   - Token/Secret の安全な保管             │
└────────────────┬────────────────────────┘
                 │  HTTPS
┌────────────────▼────────────────────────┐
│  SwitchBot Cloud API (api.switch-bot.com)│
└─────────────────────────────────────────┘
```

## 重要な設計判断：署名生成と API 呼び出しは Rust 側で行う

- フロントエンド（WebView）から直接 API を叩くと **CORS の問題**が発生する。
- Token / Secret を WebView 側に置くと**秘匿情報が露出**しやすい。
- Rust バックエンドに集約することで、両方を回避できる。

フロントエンドは Tauri IPC（`invoke`）経由で Rust 側のコマンドを呼び出すのみとし、認証情報・署名・生の API 通信には一切触れない。詳細な API 仕様は [`switchbot-api.md`](./switchbot-api.md)、秘匿情報の取り扱いは [`security.md`](./security.md) を参照。

## M1: 認証フロー（署名・セキュアストレージ・接続テスト）

認証まわりは Rust 側 `src-tauri/src/switchbot/` に集約する。

- **`signature.rs`**: `HMAC-SHA256(token + t + nonce, secret)` → Base64 → 大文字化の純関数。`t`（13 桁ミリ秒）・`nonce`（UUID v4）は呼び出し側で生成する。
- **`client.rs`**: reqwest `Client`（`rustls-tls`）を再利用し、リクエストごとに `t`/`nonce`/署名ヘッダを付与。接続判定は **HTTP 200 かつ封筒 `statusCode === 100`**。401 は `Unauthorized`、`statusCode != 100` は `ApiStatus`。
- **`credentials.rs`**: OS keyring（macOS Keychain / Windows Credential Manager / Linux は pure-Rust zbus secret-service）に save/load/delete。
- **`error.rs`**: 秘匿値・署名を含まない安全なエラー型（`{ code, message }`）。

### コマンドと画面フロー

| コマンド | 役割 |
|---|---|
| `save_credentials(token, secret)` | keyring に保存（疎通確認なし） |
| `test_connection()` | 保存済み認証情報で `GET /v1.1/devices` を叩き疎通確認 |
| `disconnect()` | keyring エントリを削除 |
| `get_connection_state()` | 保存済みか否か（`{ saved }`）を返す。秘匿値を含まない |

設定画面は「保存して接続」→ 保存成功後に自動で `test_connection`、および「接続をテスト」「接続を解除」を実コマンドへ結線する。保存済みの Token / Secret は**固定ドット + 「保存済み」バッジ**で表示し、秘匿値（末尾等を含む）は WebView に一切返さない。

> レート「残数」表示は扱わない。公式 v1.1 に残数フィールド・rate-limit ヘッダは存在しないため、上限（10,000 / 日）の静的補足表示のみとする。

### 接続を DataSource から分離

接続（認証）は device/scene/sensor を扱う `SwitchBotlerDataSource` から切り離し、専用の **`ConnectionGateway`**（`src/data/connection.ts`）に分ける。実体は Tauri IPC 実装 `tauri-connection.ts`。`src/data/index.ts` が `connectionGateway` を単一の差し替え点として公開する。#9 は device/scene/sensor のみを Tauri 実装へ差し替える。

### env フォールバックは release で無効化

`credentials::load` は **keyring 優先**で、取得不可のときのみ **debug ビルドに限り** 環境変数（Infisical 注入の `SWITCHBOT_TOKEN` / `SWITCHBOT_SECRET`）へフォールバックする。この経路は `#[cfg(debug_assertions)]` でガードし、`release` ではコンパイル時に除去する（本番で env を拾う事故を防ぐ）。「保存済み」の判定（`has_credentials`）は keyring のみを見る。

## フロントエンド構成

### ディレクトリ構成

```
src/
├── main.tsx                  # エントリ。index.css 読込 + 描画前テーマ適用（FOUC 回避）
├── App.tsx                   # AppShell を描画するだけの薄いルート
├── index.css                 # Tailwind v4 + Soft Depth トークン（デザインの起点）
├── lib/utils.ts              # cn()（clsx + tailwind-merge）
├── data/                     # データ層（ドメイン型 + DataSource + 単一差し替え点）
│   ├── types.ts              # view-model 型 + 導出関数（Device / Scene / SensorReadings 等）
│   ├── source.ts             # SwitchBotlerDataSource interface（唯一のデータ境界）
│   ├── hooks.ts              # 読み取り主体の軽量フック（useScenes / useSensors）
│   └── index.ts              # アクティブな dataSource を export する唯一の差し替え点
├── mocks/                    # モック実装（データ層の背後。#9 で Tauri 実装に差し替え）
│   ├── fixtures.ts           # モックデータ本体（mockup 準拠）
│   └── mock-source.ts        # DataSource のモック実装（擬似レイテンシ + 可変 in-memory 状態）
├── stores/                   # Zustand ストア
│   ├── theme-store.ts        # テーマ（light/dark/system）
│   ├── navigation-store.ts   # 画面遷移（activeView / selectedDeviceId）
│   ├── device-store.ts       # デバイス一覧 + 電源/制御操作（dataSource 経由）
│   └── connection-store.ts   # 接続状態・レート残・マスク済み認証表示値
├── components/
│   ├── ui/                   # shadcn/ui コンポーネント（Soft Depth 適用済み）
│   ├── app-shell/            # サイドバー + シェルレイアウト
│   ├── device/ charts/ sensor/ scene/ connection/ tray/  # 画面部品
│   ├── view-header.tsx       # 各画面共通ヘッダ（title/subtitle/戻る/右アクション）
│   └── theme-toggle.tsx      # ライト/ダーク切替
└── views/                    # 画面本体 + registry（画面メタの SSoT）
```

### データ層方針（差し替えの単一境界）

UI（view / component / store / hook）は SwitchBot API の生レスポンス形を一切知らない。
参照するのは `src/data` が公開する **view-model 型** と **`dataSource`** のみとする。

- **`src/data/types.ts`**: 画面が必要とする形のドメイン型（view-model）。API 生形の憶測ではなく、
  「画面がどう使うか」から定義する。表示ラベルや操作アフォーダンスの導出関数（`deviceStatusLabel` /
  `deviceInteraction`）もここに置く。
- **`src/data/source.ts`**: `SwitchBotlerDataSource` interface。アプリが依存する唯一のデータ境界。
- **`src/data/index.ts`**: アクティブな `dataSource` を export する **唯一の差し替え点**。
- **`src/mocks/`**: 現状の実装（モック）。`view` / `store` / `hook` はここを **直 import してはならない**
  （必ず `src/data` 経由）。可変な in-memory 状態を持ち、トグル・明るさ変更などが後続の取得に反映される。

#### #9（Tauri 実装）への差し替え手順

1. `src/data/` に Tauri IPC 実装（例: `tauri-source.ts`）を追加し、`SwitchBotlerDataSource` を実装する
   （各メソッドで `@tauri-apps/api` の `invoke` を呼ぶ）。
2. `src/data/index.ts` の `dataSource` の代入を mock 実装から Tauri 実装に **1 行差し替える**。
3. UI・ストア・フックは view-model 型のみに依存しているため、原則として変更不要。
   （API 生形 → view-model の変換は新しい DataSource 実装の内部責務とする。）

### デザイン / テーマ戦略

- **Tailwind CSS v4**（`@tailwindcss/vite` プラグイン方式）+ **shadcn/ui**（Radix UI）+ **lucide-react**。
- デザイントークン（**Soft Depth**）は `src/index.css` に一元定義する。SSoT は [`design-system/MASTER.md`](../../design-system/MASTER.md) と [`docs/mockup/`](../mockup/)。
  - shadcn のセマンティック変数（`--background` / `--card` / `--primary` / `--ring` 等）へ Soft Depth のカラーを割り当て、`@theme inline` で Tailwind ユーティリティに公開する。
  - 影は `--raise` / `--inset` 系トークンと `shadow-raise` / `shadow-inset` ユーティリティで表現する。コンポーネントに生 hex を書かない。
  - フォーカスは陰影に頼らず明示的なリング（`--ring` = accent 色 + offset）。
- **ダークモードは `.dark` クラス方式**（shadcn 標準）。`@custom-variant dark (&:is(.dark *))` を定義し、`theme-store` が `<html>` の `.dark` を付け外しする。`system` 選択時は `matchMedia` で OS 配色に追従する。テーマ選択は localStorage に永続化する。

### 状態管理方針

- 軽量な **Zustand** を採用する。
- **画面遷移は react-router を導入せず view-state で管理する**。`navigation-store` の `activeView`（`devices` / `sensors` / `scenes` / `settings`）で現在画面を保持し、サイドバーのナビが `navigate()` で切り替える。デバイス詳細は同 store の `selectedDeviceId` で表す。画面メタ（ラベル / アイコン / 説明 / 本体）は `src/views/registry.tsx` に集約し、サイドバーとナビが同一定義を参照する。
- **共有可変状態はストア、読み取り主体はフック**という使い分けにする。
  - 複数画面から更新・参照される状態（`device` / `connection`）は Zustand ストア（`device-store` / `connection-store`）に置く。
  - 単一画面の読み取り主体データ（`scenes` / `sensors`）は軽量フック（`useScenes` / `useSensors`）で mount 時に取得する。
  - いずれも `src/data` の `dataSource` 経由でのみデータへアクセスする（境界の単一化）。
- **ヘッダは各 view が持つ**。`app-shell` は generic header を持たず、画面横断のシェル機能（トレイプレビュー / テーマ切替）のみを担う。各 view は `ViewHeader` で自前のタイトル・サブタイトル・戻る・右アクションを描画する。
