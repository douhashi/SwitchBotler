import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// テスト基盤（Vitest + Testing Library + jsdom）が機能することを確認するスモークテスト。
describe("App", () => {
  it("見出しを描画する", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Welcome to Tauri \+ React/i }),
    ).toBeInTheDocument();
  });

  it("Greet ボタンを描画する", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Greet/i })).toBeInTheDocument();
  });
});
