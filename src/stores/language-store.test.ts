import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { useLanguageStore } from "./language-store";

/** `navigator.language` を差し替える（system 解決の分岐検証用）。 */
function mockNavigatorLanguage(value: string): void {
  vi.spyOn(navigator, "language", "get").mockReturnValue(value);
}

describe("language-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.setState({ language: "system" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("setLanguage('ja') で状態が更新され i18n が ja に切り替わる", () => {
    useLanguageStore.getState().setLanguage("ja");

    expect(useLanguageStore.getState().language).toBe("ja");
    expect(i18n.language).toBe("ja");
  });

  it("setLanguage('en') で i18n が en に切り替わる", () => {
    useLanguageStore.getState().setLanguage("ja");
    useLanguageStore.getState().setLanguage("en");

    expect(useLanguageStore.getState().language).toBe("en");
    expect(i18n.language).toBe("en");
  });

  it("setLanguage('system') はシステム言語(ja)へ解決して適用する", () => {
    mockNavigatorLanguage("ja-JP");

    useLanguageStore.getState().setLanguage("system");

    expect(useLanguageStore.getState().language).toBe("system");
    expect(i18n.language).toBe("ja");
  });

  it("setLanguage('system') 未対応言語(fr)は en にフォールバックする", () => {
    mockNavigatorLanguage("fr-FR");

    useLanguageStore.getState().setLanguage("system");

    expect(i18n.language).toBe("en");
  });

  it("選択した言語が localStorage に永続化される", () => {
    useLanguageStore.getState().setLanguage("en");

    const persisted = JSON.parse(
      localStorage.getItem("switchbotler-language") ?? "{}",
    );
    expect(persisted.state.language).toBe("en");
  });
});
