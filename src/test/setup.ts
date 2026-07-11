// Vitest のグローバルセットアップ。
// @testing-library/jest-dom のカスタムマッチャ（toBeInTheDocument 等）を有効化し、
// 各テスト後に DOM を自動クリーンアップする。
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Tauri IPC は外部境界。jsdom には存在しないため、既定のスタブを 1 か所で用意する。
// 個別テストで挙動を差し替えたい場合は `@tauri-apps/api/core` を vi.mock する。
type TauriWindow = Window & {
  __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
};
const tauriWindow = window as TauriWindow;
if (!tauriWindow.__TAURI_INTERNALS__) {
  tauriWindow.__TAURI_INTERNALS__ = {
    // 既定は「未保存」。接続系コマンドは副作用なしで解決する。
    invoke: async (cmd: string) => (cmd === "get_connection_state" ? { saved: false } : null),
  };
}

// jsdom は matchMedia を実装しないため、テーマ解決（prefers-color-scheme）用にスタブする。
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
});
