# SwitchBotler

> SwitchBot API を使って、デスクトップから SwitchBot デバイスを操作するクロスプラットフォームアプリ

**SwitchBotler**（スイッチボトラー）は、SwitchBot Cloud API v1.1 を利用して SwitchBot デバイスを Windows / macOS / Linux から操作するデスクトップアプリケーション。名前は **SwitchBot + Butler（執事）** の造語。システムトレイ常駐 + グローバルショートカットで、PC の作業机から手を離さずにデバイスを操作できる軽量ユーティリティを目指す。

## 特徴

- 🖥️ **クロスプラットフォーム** — Windows / macOS / Linux で同じ UI
- 🪶 **軽量** — Tauri v2 採用でバンドル 3〜10MB・低メモリ
- 🔒 **安全** — Token / Secret は OS のセキュアストレージに保管し、署名生成・API 呼び出しは Rust 側で完結
- 🎛️ **手元の即時操作** — トレイ常駐からデバイス操作・シーン実行

## 技術構成

Tauri v2 + Rust（バックエンド） / React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand（フロントエンド）。
詳細は [`docs/development/architecture.md`](docs/development/architecture.md) を参照。

## ドキュメント

- **ビジネス**: [プロジェクト概要](docs/business/overview.md) / [OSS・ライセンス・商標](docs/business/model.md)
- **開発**: [アーキテクチャ](docs/development/architecture.md) / [SwitchBot API](docs/development/switchbot-api.md) / [セキュリティ方針](docs/development/security.md) / [ロードマップ](docs/development/roadmap.md) / [開発フィロソフィー](docs/development/philosophy.md)

## ライセンス

[MIT](LICENSE)

## ディスクレーマー

SwitchBotler is an unofficial, community-built application and is not affiliated with, endorsed by, or sponsored by SwitchBot (Wonderlabs, Inc.). "SwitchBot" is a trademark of its respective owner.
