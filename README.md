<p align="center">
  <img src="docs/assets/hero.svg" alt="SwitchBotler" width="760">
</p>

<p align="center">
  A cross-platform app to control your SwitchBot devices from your desktop using the SwitchBot API
</p>

<p align="center"><strong>English</strong> ・ <a href="README.ja.md">日本語</a></p>

<p align="center">
  <a href="https://github.com/douhashi/SwitchBotler/releases">⬇&nbsp;Download</a>&nbsp;·&nbsp;
  <a href="#screenshots">Screenshots</a>&nbsp;·&nbsp;
  <a href="LICENSE">MIT License</a>
</p>

**SwitchBotler** is a desktop application that controls SwitchBot devices on Windows / macOS / Linux via the SwitchBot Cloud API v1.1. With a system-tray-resident presence and global shortcuts, it aims to be a lightweight utility that lets you operate your devices without taking your hands off your desk.

## Features

- 🖥️ **Cross-platform** — The same UI on Windows / macOS / Linux
- 🪶 **Lightweight** — Built with Tauri v2 for a 3–10 MB bundle and low memory usage
- 🔒 **Secure** — Tokens / secrets are kept in the OS secure storage, and signature generation and API calls are handled entirely on the Rust side
- 🎛️ **Instant control at hand** — Operate devices and run scenes from the tray

## Download

[**Download the latest release (Releases)**](https://github.com/douhashi/SwitchBotler/releases) — Installers for Windows / macOS / Linux are distributed (currently unsigned).

## Screenshots

<p align="center">
  <img src="docs/assets/screenshot-devices.png" alt="Device list (light theme)" width="820"><br>
  <sub>Device list — light theme</sub>
</p>

<p align="center">
  <img src="docs/assets/screenshot-sensors.png" alt="Sensor status (dark theme)" width="820"><br>
  <sub>Sensor status — dark theme</sub>
</p>

<p align="center">
  <img src="docs/assets/screenshot-tray.png" alt="Tray menu (favorites)" width="300"><br>
  <sub>Tray menu (favorites)</sub>
</p>

> You can view mockups of all 6 screens by opening [`docs/mockup/index.en.html`](docs/mockup/index.en.html) (English) / [`docs/mockup/index.html`](docs/mockup/index.html) (Japanese) in your browser.

## Tech Stack

Tauri v2 + Rust (backend) / React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand (frontend).
See [`docs/development/architecture.md`](docs/development/architecture.md) for details.

## Development Setup

The toolchain is managed with [mise](https://mise.jdx.dev/) (Node.js 24.x / Rust stable / lefthook).

```sh
mise install     # Install Node.js, Rust, and lefthook
mise run setup   # npm install + enable git hooks (lefthook)
mise run dev     # Launch the Tauri app in development mode
```

Other main tasks:

| Task | Description |
|---|---|
| `mise run lint` | Run type check + Rust fmt-check + clippy together |
| `mise run typecheck` | Frontend type check (`tsc --noEmit`) |
| `mise run fmt` | Format Rust code |
| `mise run clippy` | Rust static analysis |

Git hooks run the Rust format check and type check on commit, and clippy on push.

## Documentation

- **Business**: [Project Overview](docs/business/overview.md) / [OSS, License & Trademark](docs/business/model.md)
- **Development**: [Architecture](docs/development/architecture.md) / [SwitchBot API](docs/development/switchbot-api.md) / [Security Policy](docs/development/security.md) / [Roadmap](docs/development/roadmap.md) / [Development Philosophy](docs/development/philosophy.md)

## License

[MIT](LICENSE)

## Disclaimer

SwitchBotler is an unofficial, community-built application and is not affiliated with, endorsed by, or sponsored by SwitchBot (Wonderlabs, Inc.). "SwitchBot" is a trademark of its respective owner.
