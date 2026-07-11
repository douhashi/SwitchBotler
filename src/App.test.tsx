import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import { useNavigationStore } from "@/stores/navigation-store";

const NAV_LABELS = ["デバイス", "センサー", "シーン", "設定"];

describe("App シェル", () => {
  beforeEach(() => {
    // view-state のシングルトンをテスト間で初期化する。
    useNavigationStore.setState({
      activeView: "devices",
      selectedDeviceId: null,
    });
  });

  it("4つのナビ項目を描画する", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
    for (const label of NAV_LABELS) {
      expect(
        within(nav).getByRole("button", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("初期表示はデバイス画面で、その項目に aria-current が付く", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
    expect(
      within(nav).getByRole("button", { name: "デバイス" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("heading", { name: "デバイス" }),
    ).toBeInTheDocument();
  });

  it("ナビクリックで activeView が切り替わり対応画面を表示する", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });

    await user.click(within(nav).getByRole("button", { name: "センサー" }));

    expect(useNavigationStore.getState().activeView).toBe("sensors");
    expect(
      within(nav).getByRole("button", { name: "センサー" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("button", { name: "デバイス" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("heading", { name: "センサー" }),
    ).toBeInTheDocument();
  });
});
