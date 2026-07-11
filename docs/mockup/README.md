# 画面モックアップ

SwitchBotler の UI モックアップ（視覚リファレンス）。デザイン方向は **Soft Depth**（進化系ソフトUI）。トークン/ルールの正典は [`design-system/MASTER.md`](../../design-system/MASTER.md)、ロゴ/ブランドは [`design-system/brand.md`](../../design-system/brand.md)。

> ブランドマーク（蝶ネクタイ×トグル）とワードマーク（`Switch`＝前景色／`Botler`＝インディゴ）は確定版を反映済み。

## ファイル

| ファイル | 内容 |
|---|---|
| [`index.html`](./index.html) | 主要4画面（デバイス一覧 / センサーステータス / シーン実行 / 設定）。右上の「テーマ」ボタンでライト/ダーク切替 |
| [`index.en.html`](./index.en.html) | `index.html` の英語版（表示テキストのみ英訳・構造/CSS/トークンは同一） |
| [`detail.html`](./detail.html) | デバイス詳細（操作UI）。エアコン=スライダー基調＋運転モードで色連動、照明=明るさ＋カラー、モード色の凡例つき。右上で Light/Dark/System 切替 |
| [`detail.en.html`](./detail.en.html) | `detail.html` の英語版（表示テキストのみ英訳・構造/CSS/トークンは同一） |
| [`tray.html`](./tray.html) | トレイポップアップの操作性拡張案（全デバイス操作＝エアコン等は「>」で詳細へ / 幅拡大 / 可変高＋各リスト独立スクロール）。右上で Light/Dark/System 切替。**実装反映済み**（幅 360px・可変高＋上限クランプ・各リスト独立スクロール／下端フェード。#61） |
| [`tray.en.html`](./tray.en.html) | `tray.html` の英語版（表示テキストのみ英訳・構造/CSS/トークンは同一） |
| [`onboarding.html`](./onboarding.html) | 未接続（`saved:false`）時のメニューなしオンボーディング画面＋トレイの表記案（未設定 / 到達不能 / 接続済みの3状態）。右上で Light/Dark/System 切替 |
| [`themes.html`](./themes.html) | Soft Depth のライト/ダークを同一UIで並べた比較＋セマンティックトークン表 |

ブラウザでそのまま開ける（ビルド不要・自己完結）。トグルやスライダーは押して手触りを確認できる。

## 実装ルール

モックアップは静的な視覚リファレンス。**実装（React）では以下に従う**:

### アイコン — Lucide パックのみ
- `lucide-react` を使う。**SVG を手書きしない・絵文字をアイコンに使わない**。
- stroke `1.75` / `round` cap・join / サイズは `16 / 18 / 20 / 28`。
- モックHTML内のアイコンは Lucide を模した inline SVG（静的HTMLで npm 依存を持てないため）。実装では下表の Lucide 名に置き換える。

### UIコンポーネント — shadcn/ui
- **shadcn/ui**（Radix UI + Tailwind CSS v4）。構造・アクセシビリティ・キーボード操作は shadcn/Radix に任せ、**見た目は Soft Depth トークン（`--raise` / `--inset` 等）で上書き**する。
- `components.json`: `baseColor: neutral` / `cssVariables: true` / `iconLibrary: lucide`。

### UI要素 → shadcn/ui + Lucide 対応

| UI要素 | shadcn/ui | Lucide |
|---|---|---|
| デバイス ON/OFF | `Switch` | `lightbulb` / `fan` / `blinds` / `droplet` |
| ボタン（実行・テスト・更新） | `Button` | `play` / `arrow-right` / `refresh-cw` |
| Token / Secret 入力 | `Input` | `eye` / `eye-off` |
| デバイス・スタットカード | `Card` | — |
| 明るさ・カーテン開度 | `Slider` | `sun` |
| ナビ | `Button`(ghost)＋選択状態 | `layout-grid` / `activity` / `layers` / `settings` |
| 接続バナー | `Alert` | `check` / `shield-check` |
| 状態ラベル | `Badge` | — |
| トレイのポップオーバー | `Popover` | — |
| 破壊的操作の確認 | `AlertDialog` | — |

### トレイポップアップのレイアウト（実装反映・#61）

- **幅は固定 360px**（ウィンドウの 1 列カード相当）。`tauri.conf.json` の初期幅と `TRAY_WIDTH` を一致させる。
- **高さは内容追従＋上限クランプ**。内側リストの px 上限が主機構で、`MAX_TRAY_HEIGHT = DEVICE_MAX(300) + SCENE_MAX(150) + CHROME(150)` は安全弁。
- **各リストは独立スクロール**（デバイス 300px / シーン 150px 上限）。`overflow-y-auto` + `overscroll-contain` で親ウィンドウへスクロールを伝播させない。
- **下端フェード**は続きがある時のみ表示し、最下端到達で消す（下端のみ）。フェード層はスクロールしないラッパーに絶対配置で固定する。
- スクロールバーは `--scroll` トークン＋ `scrollbar-soft` ユーティリティで Soft Depth に馴染ませる。

## セットアップ（実装時の想定手順）

Vite + React + Tailwind v4 + shadcn/ui（[shadcn 公式手順](https://ui.shadcn.com/docs/installation/vite)に準拠）:

```sh
npm install tailwindcss @tailwindcss/vite   # Tailwind v4（プラグイン方式）
# src/index.css を `@import "tailwindcss";` に置換
# tsconfig / vite.config に @/* エイリアスを追加
npx shadcn@latest init                       # baseColor: neutral, iconLibrary: lucide
npx shadcn@latest add switch button input card slider alert badge popover alert-dialog
```

導入後、shadcn の CSS 変数（`--background` `--foreground` `--primary` `--card` `--muted` `--border` `--ring`）へ MASTER.md のカラートークンを割り当て、コンポーネントに Soft Depth の影トークンを重ねる。
