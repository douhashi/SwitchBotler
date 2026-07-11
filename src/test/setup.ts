// Vitest のグローバルセットアップ。
// @testing-library/jest-dom のカスタムマッチャ（toBeInTheDocument 等）を有効化し、
// 各テスト後に DOM を自動クリーンアップする。
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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
