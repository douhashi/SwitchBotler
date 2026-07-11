# 開発時のシークレット管理（Infisical）

開発時の SwitchBot API 認証情報は **[Infisical](https://infisical.com/)** で管理する。平文ファイルにコミットしない。

## キー

| キー | 内容 |
|---|---|
| `SWITCHBOT_TOKEN` | SwitchBot API トークン |
| `SWITCHBOT_SECRET` | SwitchBot API シークレット |

- 命名は「SwitchBot の」認証情報であることを表す `SWITCHBOT_` プレフィックス。UPPER_SNAKE_CASE。
- 発行元: SwitchBot アプリ → プロフィール → 設定 → 開発者向けオプション。
- **環境の分離は Infisical の Environment（Development / Staging / Production）で行う**。キー名に `_DEV` 等のサフィックスを付けない。開発用の値は **Development 環境**に登録する。

## 実行方法

Infisical から環境変数を注入してアプリを起動する:

```sh
infisical run --env=dev -- mise run dev
```

前提:
- Infisical CLI をインストール済み（`infisical login` 済み）。
- リポジトリ直下の `.infisical.json` が対象 workspace を指している（設定済み）。
- 毎回 `--env` を打ちたくない場合は `.infisical.json` の `defaultEnvironment` に環境スラッグ（例: `dev`）を設定する。

シークレットは Infisical で一元管理する。`.env` ファイルは使わない。

## 本番との違い

- ここでの env / Infisical は **開発専用の便宜**。
- 本番はユーザーが入力した Token / Secret を **OS のセキュアストレージ（keyring: macOS Keychain / Windows Credential Manager / Linux Secret Service）** に保管する（[`security.md`](./security.md) 参照）。
- どの経路でも Token / Secret / 署名を**ログや画面に平文出力しない**。

> 実装（M1）では、Rust 側でセキュアストレージを優先し、未設定の開発時に限り `SWITCHBOT_TOKEN` / `SWITCHBOT_SECRET` を環境変数から読むフォールバックを設ける想定。
