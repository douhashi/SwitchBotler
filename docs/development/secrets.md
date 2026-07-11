# 開発時のシークレット管理（Infisical）

**ローカル開発と CI** における SwitchBot API 認証情報は **[Infisical](https://infisical.com/)** で管理する。平文ファイルにコミットしない。

> **重要**: Infisical / 環境変数は **開発（ローカル・CI）専用**。本番アプリは一切使わない。本番のシークレットは **OS セキュアストレージ（keyring）が単一の正（SSoT）**。詳細は後述の「本番の扱い」。

## キー

| キー | 内容 |
|---|---|
| `SWITCHBOT_TOKEN` | SwitchBot API トークン |
| `SWITCHBOT_SECRET` | SwitchBot API シークレット |

- 命名は「SwitchBot の」認証情報であることを表す `SWITCHBOT_` プレフィックス。UPPER_SNAKE_CASE。
- 発行元: SwitchBot アプリ → プロフィール → 設定 → 開発者向けオプション。
- **環境の分離は Infisical の Environment（例: Development / CI）で行う**。キー名に `_DEV` 等のサフィックスを付けない。開発用の値は **Development 環境**に登録する。

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

## 本番の扱い（重要）

- 本番アプリのシークレットの **単一の正（SSoT）は OS セキュアストレージ（keyring: macOS Keychain / Windows Credential Manager / Linux Secret Service）**。ユーザーが入力した Token / Secret をここに保管し、実行時は **ここからのみ**読む（[`security.md`](./security.md) 参照）。
- **本番ビルドに Infisical / 環境変数へのフォールバックを組み込まない**。「セキュアストレージが空なら env を読む」といった実装は**禁止**（本番で意図せず env を拾う事故を防ぐ）。
- env（Infisical 注入）を読む経路は **ローカル開発 / CI ビルドに限定**する。ビルドプロファイル（`debug` / `release`）や dev 専用フラグで分離し、`release` では env 読み取り経路そのものを無効化する。
- どの経路でも Token / Secret / 署名を**ログや画面に平文出力しない**。
