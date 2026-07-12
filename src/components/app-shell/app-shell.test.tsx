import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri のウィンドウ API は外部境界。この spec では close-requested ハンドラを捕捉して
// 実際のクローズ要求を模擬するため、ローカルにモックする（setup.ts の既定を上書き）。
const { winMock, captured, prefs } = vi.hoisted(() => {
  const captured: { close?: (event: { preventDefault: () => void }) => void } = {};
  const noop = () => {};
  const winMock = {
    label: "main",
    listen: vi.fn(async () => noop),
    onFocusChanged: vi.fn(async () => noop),
    onCloseRequested: vi.fn(async (handler: (e: { preventDefault: () => void }) => void) => {
      captured.close = handler;
      return noop;
    }),
    hide: vi.fn(async () => {}),
    show: vi.fn(async () => {}),
    setFocus: vi.fn(async () => {}),
    unminimize: vi.fn(async () => {}),
  };
  // テストごとにリセットできる永続ストア（案内フラグの初期値を制御する）。
  const prefs = new Map<string, unknown>();
  return { winMock, captured, prefs };
});
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => winMock }));
vi.mock("@tauri-apps/plugin-store", () => ({
  load: async () => ({
    get: async (key: string) => prefs.get(key),
    set: async (key: string, value: unknown) => {
      prefs.set(key, value);
    },
    save: async () => {},
    delete: async (key: string) => prefs.delete(key),
  }),
}));

import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { AppShell } from "./app-shell";

describe("AppShell close-to-tray", () => {
  beforeEach(() => {
    winMock.hide.mockClear();
    winMock.onCloseRequested.mockClear();
    captured.close = undefined;
    prefs.clear();
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
    useDeviceStore.setState({ devices: [], loading: false, loaded: true, error: null });
    useConnectionStore.setState({ loaded: false });
    useFavoritesStore.setState({ deviceIds: [], sceneIds: [], loaded: true });
  });

  it("初回のクローズ要求で終了せず、常駐案内ダイアログを表示してから隠す", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    // フラグ読込後に close ハンドラが登録される。
    await waitFor(() => expect(winMock.onCloseRequested).toHaveBeenCalled());

    const event = { preventDefault: vi.fn() };
    act(() => captured.close?.(event));

    // 実クローズは止め、初回は案内ダイアログを出す（この時点では hide しない）。
    expect(event.preventDefault).toHaveBeenCalled();
    await screen.findByText("トレイに常駐します");
    expect(winMock.hide).not.toHaveBeenCalled();

    // 案内を了解するとウィンドウを隠す（＝トレイ常駐）。
    await user.click(screen.getByRole("button", { name: "分かりました" }));
    await waitFor(() => expect(winMock.hide).toHaveBeenCalled());
  });

  it("案内済みならクローズ要求で即座に隠す（ダイアログは出さない）", async () => {
    // 既に案内済みにしておく。
    prefs.set("closeToTrayNoticeSeen", true);

    render(<AppShell />);
    await waitFor(() => expect(winMock.onCloseRequested).toHaveBeenCalled());

    act(() => captured.close?.({ preventDefault: vi.fn() }));

    await waitFor(() => expect(winMock.hide).toHaveBeenCalled());
    expect(screen.queryByText("トレイに常駐します")).toBeNull();
  });
});
