import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveLanguage } from "./resolve";

/** `navigator.language` を差し替える（system 解決の分岐検証用）。 */
function mockNavigatorLanguage(value: string): void {
  vi.spyOn(navigator, "language", "get").mockReturnValue(value);
}

describe("resolveLanguage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("保存値 ja/en はそのまま解決する（保存値優先）", () => {
    expect(resolveLanguage("ja")).toBe("ja");
    expect(resolveLanguage("en")).toBe("en");
  });

  it("system かつシステム言語が ja なら ja に解決する", () => {
    mockNavigatorLanguage("ja-JP");
    expect(resolveLanguage("system")).toBe("ja");
  });

  it("system かつシステム言語が en なら en に解決する", () => {
    mockNavigatorLanguage("en-US");
    expect(resolveLanguage("system")).toBe("en");
  });

  it("system かつ未対応言語(fr)なら en にフォールバックする", () => {
    mockNavigatorLanguage("fr-FR");
    expect(resolveLanguage("system")).toBe("en");
  });
});
