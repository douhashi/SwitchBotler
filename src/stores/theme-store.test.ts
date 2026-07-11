import { beforeEach, describe, expect, it } from "vitest";

import { useThemeStore } from "./theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    useThemeStore.setState({ theme: "system" });
  });

  it("setTheme('dark') で状態が更新され html に .dark が付く", () => {
    useThemeStore.getState().setTheme("dark");

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setTheme('light') で .dark が外れる", () => {
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("選択したテーマが localStorage に永続化される", () => {
    useThemeStore.getState().setTheme("dark");

    const persisted = JSON.parse(
      localStorage.getItem("switchbotler-theme") ?? "{}",
    );
    expect(persisted.state.theme).toBe("dark");
  });
});
