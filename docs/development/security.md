# セキュリティ / プライバシー方針

SwitchBotler は SwitchBot アカウントの Token / Secret を扱うため、秘匿情報の取り扱いを最優先で設計する。

## 秘匿情報の保管

- **Token / Secret は OS のセキュアストレージに保管**する。**本番ではこれが単一の正（SSoT）**であり、実行時はここからのみ読む。
  - 例: `keyring` 経由で macOS Keychain / Windows Credential Manager / Linux Secret Service を利用。
- **平文設定ファイルへの保存は避ける**。
- **本番に環境変数 / Infisical へのフォールバックを設けない**（「セキュアストレージが空なら env を読む」を禁止）。env（Infisical）は開発・CI 専用で、`release` ビルドでは読み取り経路を無効化する（[`secrets.md`](./secrets.md)）。

## 秘匿情報の露出防止

- 秘匿情報は WebView 側に渡さず、**Rust 側に閉じ込める**。
  - フロントエンドは Token/Secret を保持せず、Tauri IPC 経由で「操作の実行」だけを依頼する。
- **ログに Token / Secret / 署名を出力しない**。

## 関連

- API 通信・署名生成の設計は [`architecture.md`](./architecture.md) / [`switchbot-api.md`](./switchbot-api.md) を参照。
