// Vitest のグローバルセットアップ。
// @testing-library/jest-dom のカスタムマッチャ（toBeInTheDocument 等）を有効化し、
// 各テスト後に DOM を自動クリーンアップする。
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
