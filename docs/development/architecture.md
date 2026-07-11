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

## フロントエンド構成

### ディレクトリ構成

```
src/
├── main.tsx                  # エントリ。index.css 読込 + 描画前テーマ適用（FOUC 回避）
├── App.tsx                   # AppShell を描画するだけの薄いルート
├── index.css                 # Tailwind v4 + Soft Depth トークン（デザインの起点）
├── lib/utils.ts              # cn()（clsx + tailwind-merge）
├── stores/                   # Zustand ストア
│   ├── theme-store.ts        # テーマ（light/dark/system）
│   └── navigation-store.ts   # 画面遷移（activeView）
├── components/
│   ├── ui/                   # shadcn/ui コンポーネント（Soft Depth 適用済み）
│   ├── app-shell/            # サイドバー + シェルレイアウト
│   └── theme-toggle.tsx      # ライト/ダーク切替
└── views/                    # 画面本体 + registry（画面メタの SSoT）
```

### デザイン / テーマ戦略

- **Tailwind CSS v4**（`@tailwindcss/vite` プラグイン方式）+ **shadcn/ui**（Radix UI）+ **lucide-react**。
- デザイントークン（**Soft Depth**）は `src/index.css` に一元定義する。SSoT は [`design-system/MASTER.md`](../../design-system/MASTER.md) と [`docs/mockup/`](../mockup/)。
  - shadcn のセマンティック変数（`--background` / `--card` / `--primary` / `--ring` 等）へ Soft Depth のカラーを割り当て、`@theme inline` で Tailwind ユーティリティに公開する。
  - 影は `--raise` / `--inset` 系トークンと `shadow-raise` / `shadow-inset` ユーティリティで表現する。コンポーネントに生 hex を書かない。
  - フォーカスは陰影に頼らず明示的なリング（`--ring` = accent 色 + offset）。
- **ダークモードは `.dark` クラス方式**（shadcn 標準）。`@custom-variant dark (&:is(.dark *))` を定義し、`theme-store` が `<html>` の `.dark` を付け外しする。`system` 選択時は `matchMedia` で OS 配色に追従する。テーマ選択は localStorage に永続化する。

### 状態管理方針

- 軽量な **Zustand** を採用する。
- **画面遷移は react-router を導入せず view-state で管理する**。`navigation-store` の `activeView`（`devices` / `sensors` / `scenes` / `settings`）で現在画面を保持し、サイドバーのナビが `navigate()` で切り替える。画面メタ（ラベル / アイコン / 説明 / 本体）は `src/views/registry.tsx` に集約し、サイドバーとヘッダが同一定義を参照する。
