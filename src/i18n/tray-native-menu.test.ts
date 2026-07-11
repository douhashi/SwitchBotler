import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC は外部境界。invoke をモックして送信引数を検証する。
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

import i18n from "@/i18n";
import { syncNativeTrayMenu } from "./tray-native-menu";

describe("syncNativeTrayMenu", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // 既定ロケール(ja)へ戻す（他テストへの影響を避ける）。
    await i18n.changeLanguage("ja");
    vi.restoreAllMocks();
  });

  it("ja では日本語ラベルで set_tray_menu_labels を invoke する", async () => {
    await i18n.changeLanguage("ja");

    syncNativeTrayMenu();

    expect(invokeMock).toHaveBeenCalledWith("set_tray_menu_labels", {
      openWindow: "ウィンドウを開く",
      settings: "設定",
      quit: "終了",
    });
  });

  it("en では英語ラベルで set_tray_menu_labels を invoke する", async () => {
    await i18n.changeLanguage("en");

    syncNativeTrayMenu();

    expect(invokeMock).toHaveBeenCalledWith("set_tray_menu_labels", {
      openWindow: "Open window",
      settings: "Settings",
      quit: "Quit",
    });
  });
});
