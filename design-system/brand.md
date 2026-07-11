# SwitchBotler Brand — ロゴ / ブランドデザイン

> ロゴとブランド表現の正典。視覚トークン（色・影・タイポ）の SSoT は [`MASTER.md`](./MASTER.md)。本書はその上に立つ「ブランドの顔」の規定。

## コンセプト

**SwitchBot ＋ Butler（執事）** の造語。「デバイスに仕えさせる執事」。
ロゴマークは **執事の蝶ネクタイ** と **ON 状態のトグルスイッチ** を1つの幾何形に融合する。

- 左右の羽 ＝ 蝶ネクタイ（Butler／おもてなし）
- 中央の丸ノブ ＝ トグルのノブ（Switch／即時操作）

名前の由来が一目で伝わり、**SwitchBot 公式の意匠に一切依存しない完全オリジナル**。
商標配慮とリネーム余地（`botler` 系）の方針（[`docs/business/model.md`](../docs/business/model.md)）に沿う。将来アプリ名が変わっても、蝶ネクタイのシンボルは生き残る。

## ロゴマーク（構成）

`viewBox="0 0 120 120"`。左右対称・幾何・単色。

| 要素 | 値 |
|---|---|
| 左の羽 | polygon `27,43 27,77 53,60` |
| 右の羽 | polygon `93,43 93,77 67,60` |
| 中央ノブ | circle `cx=60 cy=60 r=15.5` |
| 角丸 | `stroke-width:8` / `stroke-linejoin:round`（羽の角を丸める） |

羽の先端（x=53 / 67）とノブ（半径15.5＝44〜76）が重なり、単色でも「結び目のある蝶ネクタイ」の1つのシルエットになる。この単純さが極小サイズの可読性を担保する。

## クリアスペース & 最小サイズ

- **クリアスペース**: マーク周囲に「羽1枚ぶん（ノブ直径 ≒ 高さの40%）」以上の余白を確保する。
- **最小サイズ**: マーク単体は **16px** まで、ワードマーク併記は **20px** まで。トレイ常駐が前提なので 16px 可読性を必須要件とする。

## カラー

インディゴ基調（[`MASTER.md`](./MASTER.md) のトークン準拠）。

| 用途 | Light | Dark |
|---|---|---|
| マーク（塗り） | `--accent-strong #4F46E5` | `#818CF8` |
| アプリ/OS アイコン地 | グラデ `#6366F1 → #4F46E5` | 同左（地は反転しない） |
| アイコン上のマーク | `#FFFFFF` | `#FFFFFF` |

- ダークは**色を反転しない**。地・面・マークだけ差し替える（MASTER.md の Direction）。
- マーク単色版は `currentColor` で塗るため、面の `color` に追従する（面タイルは `color: var(--accent)`）。

## ワードマーク（アプリ名の表示）

**アプリ名を表示する箇所は必ず2色で組む。**

- **`Switch`** … その場の地色に対する**前景色（`--ink` / foreground）**。→ ダーク地では白、ライト地ではインク。
- **`Botler`** … 常に**アクセント（`--accent`）**＝インディゴ。

```html
<!-- 実装イメージ -->
Switch<span class="bot">Botler</span>
<!-- .bot { color: var(--accent); } -->
```

「Switch は地に馴染む前景／Botler は常にインディゴ」という規則。造語であることを色で示し、`Botler`（＝プロダクトの識別子）を際立たせる。ダーク基調で「白＋インディゴ」に見えるのが基準の見え方。

> ページ見出し（eyebrow）や `<title>` などの**プレーンテキスト表記は対象外**。あくまで UI 上の「アプリ名ラベル」に適用する。

## アプリ / OS アイコン

- 角丸スクエア（`rx` ≒ 22.5%）の**インディゴグラデタイル ＋ 白いマーク**。
- Dock / タスクバー / トレイで背景から浮くよう、地はインディゴ・マークは白の高コントラストにする。
- ソースは [`assets/app-icon.svg`](./assets/app-icon.svg)。全プラットフォームアイコンはこれ1枚から生成する。

## Do / Don't

**Do**
- クリアスペースを確保する
- 単色（インディゴ）またはテーマ地の反転で運用する
- トレイは中央ノブを残したモノクロ・グリフに簡略化してよい

**Don't**
- SwitchBot 公式ロゴ／デバイス形状を流用しない
- 羽を非対称に歪めない・背後に X 線などの装飾を足さない
- 指定外の色相（緑・橙など）でマークを塗らない
- ドロップシャドウを強くしてエンボスを効かせすぎない

## アセット一覧

| ファイル | 用途 |
|---|---|
| [`assets/logo-mark.svg`](./assets/logo-mark.svg) | マーク単色（`currentColor`）。アプリ内の任意色タイントに使う |
| [`assets/logo-mark-indigo.svg`](./assets/logo-mark-indigo.svg) | マーク・インディゴ塗り |
| [`assets/app-icon.svg`](./assets/app-icon.svg) | OS/トレイアイコンのソース（グラデタイル＋白マーク） |
| [`assets/app-icon.png`](./assets/app-icon.png) | 上記を 1024px にラスタライズしたマスター |
| `../public/switchbotler.svg` | Web（Vite）favicon。`app-icon.svg` と同一 |
| `../src-tauri/icons/*` | 生成済みプラットフォームアイコン（`icon.ico` / `icon.icns` / 各 PNG） |

### 再生成手順

マーク形状や色を変える場合は **`app-icon.svg` を編集 → 以下を実行**（1ソースから全アイコンを再生成）:

```sh
# 1024px マスターを更新
rsvg-convert -w 1024 -h 1024 design-system/assets/app-icon.svg -o design-system/assets/app-icon.png
# 全プラットフォームアイコンを生成（src-tauri/icons/ に出力）
npm run tauri -- icon design-system/assets/app-icon.png
# モバイル未対応のため ios/ android/ は削除
rm -rf src-tauri/icons/ios src-tauri/icons/android
# favicon も同期
cp design-system/assets/app-icon.svg public/switchbotler.svg
```

`src-tauri/tauri.conf.json` の `bundle.icon` が参照するファイル名（`32x32.png` / `128x128.png` / `128x128@2x.png` / `icon.icns` / `icon.ico`）はこの生成物と一致している。

## 実装メモ（React）

アプリUI のアイコンは **Lucide パックのみ**（MASTER.md）。ただし**ブランドロゴは UI アイコンではない**ため、この規則の対象外とし、専用のブランドアセット（本書の SVG）を用いる。ロゴを React に組み込む作業は別 Issue で行う。
