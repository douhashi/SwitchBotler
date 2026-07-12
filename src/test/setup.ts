// Vitest のグローバルセットアップ。
// @testing-library/jest-dom のカスタムマッチャ（toBeInTheDocument 等）を有効化し、
// 各テスト後に DOM を自動クリーンアップする。
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

import i18n from "@/i18n";

// テストは日本語ロケールを既定とする（実利用の主要ロケール）。
// jsdom の navigator.language は "en-US" のため `system` 解決が en に寄るのを防ぎ、
// i18n の描画言語も明示的に ja へ固定する（en 表示は各テストで setLanguage して検証する）。
// resolve.test / language-store.test は `vi.spyOn(navigator, "language", "get")` で
// 差し替えるため、data ではなく getter として定義する（spy 可能・restore で ja に戻る）。
Object.defineProperty(navigator, "language", { get: () => "ja", configurable: true });
void i18n.changeLanguage("ja");

// Tauri IPC は外部境界。jsdom には存在しないため、既定のスタブを 1 か所で用意する。
// 個別テストで挙動を差し替えたい場合は `@tauri-apps/api/core` を vi.mock する。
type TauriWindow = Window & {
  __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
};
const tauriWindow = window as TauriWindow;
if (!tauriWindow.__TAURI_INTERNALS__) {
  tauriWindow.__TAURI_INTERNALS__ = {
    // 既定は空データ。全画面レンダリングのテストが実 API 無しで安全に動く。
    invoke: async (cmd: string) => {
      switch (cmd) {
        case "get_connection_state":
          return { saved: false };
        case "list_devices":
        case "list_scenes":
          return [];
        case "get_sensors":
          return { source: "", metrics: [] };
        default:
          return null;
      }
    },
  };
}

// Tauri のウィンドウ API は外部境界。jsdom には無いため、既定の no-op を 1 か所で用意する。
// window ラベルは "main" 固定。listen/onFocusChanged/onCloseRequested は unlisten を返す。
vi.mock("@tauri-apps/api/window", () => {
  const noopUnlisten = () => {};
  const currentWindow = {
    label: "main",
    listen: async () => noopUnlisten,
    onFocusChanged: async () => noopUnlisten,
    onCloseRequested: async () => noopUnlisten,
    show: async () => {},
    hide: async () => {},
    setFocus: async () => {},
    unminimize: async () => {},
  };
  return { getCurrentWindow: () => currentWindow };
});

// tauri-plugin-store も外部境界。テスト用にプロセス内メモリで永続を模す
// （path ごとに同一 Store を再利用し、実 plugin の挙動に合わせる）。
vi.mock("@tauri-apps/plugin-store", () => {
  const stores = new Map<string, Map<string, unknown>>();
  const makeStore = (path: string) => {
    let data = stores.get(path);
    if (!data) {
      data = new Map();
      stores.set(path, data);
    }
    const bucket = data;
    return {
      get: async <T>(key: string) => bucket.get(key) as T | undefined,
      set: async (key: string, value: unknown) => {
        bucket.set(key, value);
      },
      save: async () => {},
      delete: async (key: string) => bucket.delete(key),
    };
  };
  return { load: async (path: string) => makeStore(path) };
});

// tauri-plugin-autostart も外部境界。jsdom には無いため、既定のスタブを 1 か所で用意する。
// enable/disable は no-op、isEnabled は false（既定は未登録）。挙動を差し替えたいテストは
// `@tauri-apps/plugin-autostart` を個別に vi.mock する。
vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: async () => {},
  disable: async () => {},
  isEnabled: async () => false,
}));

// jsdom は ResizeObserver を実装しないため、Radix の Slider（つまみサイズ計測）用にスタブする。
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
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
