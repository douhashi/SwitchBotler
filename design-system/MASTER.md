# SwitchBotler Design System — MASTER

> Source of Truth。全画面はこのトークン/ルールに従う。個別画面の逸脱は `design-system/pages/<page>.md` に記録し、存在すればそれを優先する。
>
> ロゴ・アイコン・ワードマーク（アプリ名の配色）などブランド表現は [`brand.md`](./brand.md) を参照。

## Direction

**Soft Depth**（進化系ニューモーフィズム / ソフトUI）。物理スイッチを操る手触りを、やわらかな凸凹の陰影で表現する。丸みとインディゴが基調。ライト/ダーク両対応。

- 触感メタファ（押せる面）／大きめ角丸／プレミアム感
- ダークは**色を反転しない**。地・面・文字だけ差し替え、陰影は「暗影＝より暗いチャコール／明影＝より明るいチャコール」。白いハイライトは使わない。

## Color Tokens

セマンティックトークンで参照する（コンポーネントに生 hex を書かない）。

| 役割 | token | Light | Dark |
|---|---|---|---|
| 背景 | `--bg` | `#E6E9F1` | `#20232B` |
| 面（カード） | `--surface` | `#EDEFF6` | `#262A33` |
| 文字 | `--ink` | `#2C3444` | `#E7E9F0` |
| 補助文字 | `--muted` | `#7B8497` | `#969CAB` |
| アクセント（色相） | `--accent` | `#6366F1` | `#818CF8` |
| アクセント塗り | `--accent-strong` | `#4F46E5`（白字） | `#818CF8`（暗字 `#14162C`） |
| 状態: 良/接続 | `--ok` | `#0E9E76` | `#34D399` |
| 状態: 注意 | `--warn` | `#C77700` | `#F0B429` |
| 状態: 危険 | `--danger` | `#DC2626` | `#F87171` |
| スクロールバー（つまみ） | `--scroll` | `rgba(120,130,150,.34)` | `rgba(200,210,230,.22)` |

### 運転モード色（エアコン専用・`--m-*`）

エアコン操作 UI（`device-detail`）で、運転モードに応じて fill・大数値・モードチップ・選択状態を一括連動させるアクセント色（#65 で正典化）。色だけに頼らずアイコン＋ラベルを常時併記する（[a11y](#accessibilityソフトuiの必須ガード)）。コンポーネントは `mode → var(--m-*)` の 1 マップ経由で `--m` に束ね、`text-[var(--m)]` / `bg-[var(--m)]` で参照する（生 hex を書かない）。

| モード | token | Light | Dark |
|---|---|---|---|
| 自動 | `--m-auto` | `#6366F1` | `#818CF8` |
| 冷房 | `--m-cool` | `#2E9BE6` | `#56B6F5` |
| 除湿 | `--m-dry` | `#14A8A0` | `#34C7BE` |
| 送風 | `--m-fan` | `#7C8798` | `#9AA5B4` |
| 暖房 | `--m-heat` | `#F0872E` | `#F79B4E` |

> 自動は既存アクセント（インディゴ）と同値。送風は温度指定不可のため温度表示を muted の「—」にし、温度操作を無効化する。

### Shadows（凸凹の核）

> 陰影は「浅め・低コントラスト」に調整済み（エンボスを効かせすぎない）。強めたい場合のみ個別画面で上書きする。

| token | Light | Dark |
|---|---|---|
| `--raise`（カード凸） | `4px 4px 10px #D4D8E2, -4px -4px 10px #F6F8FC` | `5px 5px 12px #191C23, -4px -4px 11px #2C303A` |
| `--raise-sm`（小凸） | `3px 3px 7px #D6DAE3, -3px -3px 7px #F6F8FC` | `3px 3px 8px #191C23, -3px -3px 7px #2C303A` |
| `--inset`（凹/入力/トラック） | `inset 2px 2px 5px #D6DAE3, inset -2px -2px 5px #F7F9FD` | `inset 2px 2px 6px #191C23, inset -2px -2px 6px #2C303A` |
| `--inset-sm` | `inset 1px 1px 3px #D6DAE3, inset -1px -1px 3px #F7F9FD` | `inset 1px 1px 4px #191C23, inset -1px -1px 4px #2C303A` |

## Typography

- **UI**: Plus Jakarta Sans（本番は @font-face で同梱。CSP/オフラインのためCDN直リンクしない）
- **数値データ**: JetBrains Mono（温湿度・タイムスタンプ等、`font-variant-numeric: tabular-nums`）
- Weight: 400 / 500 / 600 / 700
- Scale(px): 11, 12, 13.5, 14, 16, 18, 24 / 見出しは `letter-spacing: -0.01em`、`text-wrap: balance`

## Shape & Spacing

- Radius: カード `16` / スタット `15` / 入力 `11` / アイコン枠 `12` / チップ・トグル `999(pill)`
- Spacing: 8pt ベース。gap は `8 / 12 / 14 / 16 / 20`

## Components & Icons（実装スタック）

- **UIコンポーネント**: **shadcn/ui**（Radix UI + Tailwind CSS v4）を採用。構造・アクセシビリティ・キーボード操作は shadcn/Radix に任せ、**見た目は Soft Depth トークン（`--raise` / `--inset` 等）で上書き**する。shadcn 既定のフラットな影・境界はそのまま使わない。
  - `components.json`: `baseColor: neutral` / `cssVariables: true` / `iconLibrary: lucide`。
  - shadcn の CSS 変数（`--background` `--foreground` `--primary` `--card` `--muted` `--border` `--ring`）へ、本書のカラートークンを割り当てる。
- **アイコン**: **Lucide パックのみ**（`lucide-react`）を使う。**SVG を手書きしない・絵文字をアイコンに使わない**。stroke `1.75` / `round` cap・join / サイズはトークン（`16 / 18 / 20 / 28`）。同一階層で filled/outline を混在させない。

### UI要素 → shadcn/ui + Lucide 対応表

| UI要素 | shadcn/ui | Lucide |
|---|---|---|
| デバイス ON/OFF | `Switch` | `lightbulb` / `fan` / `blinds` / `droplet` |
| ボタン（実行・テスト・更新） | `Button` | `play` / `arrow-right` / `refresh-cw` |
| Token / Secret 入力 | `Input` | `eye` / `eye-off` |
| デバイス・スタットカード | `Card` | — |
| 明るさ・カーテン開度 | `Slider` | `sun` |
| ナビ（デバイス/センサー/シーン/設定） | `Button`(ghost)＋選択状態 | `layout-grid` / `activity` / `layers` / `settings` |
| 接続バナー | `Alert` | `check` / `shield-check` |
| 状態ラベル | `Badge` | — |
| トレイのポップオーバー | `Popover` | — |
| 破壊的操作の確認 | `AlertDialog` | — |

> 注: `docs/mockup/*.html` は静的な視覚リファレンスで、アイコンは Lucide を模した inline SVG。実装では上表どおり `lucide-react` を用いる。

## Interaction

- トグル/チップ/ボタンは押下で凸→凹方向のフィードバック（150–300ms、`prefers-reduced-motion` 尊重）
- タップ領域 ≥ 40px（デスクトップ）/ フォーカスは陰影に頼らず**明示的なリング**（`outline: 2px var(--accent)` + offset）
- 破壊的操作（接続解除・削除）は `--danger` で分離配置し、確認を挟む

## Accessibility（ソフトUIの必須ガード）

陰影頼みは輪郭が弱い。以下を両テーマで担保する:

- 文字・アイコン ≥ **4.5:1**（大字/大アイコンは 3:1）
- 状態は色だけで伝えない（アイコン/テキスト/動きを併用）
- 区切りが消える箇所は境界を陰影＋わずかな線で補強

## Screens（本デザインシステムの適用対象）

1. 認証設定 — Token/Secret 入力、接続テスト、セキュアストレージ保管の明示
2. デバイス一覧 — デバイスカード（ON/OFF トグル、状態サブ）
3. デバイス操作 — 個別デバイスの詳細操作（明るさ/色、カーテン開度、エアコン等）
4. センサーステータス — 温湿度等のスタット＋スパークライン
5. シーン実行 — シーン一覧とワンクリック実行
6. トレイメニュー — 小さなポップオーバー（主要操作の抜粋）

> 秘匿情報（Token/Secret）は UI 上マスク表示。ログ/画面に平文で出さない（`docs/development/security.md`）。
