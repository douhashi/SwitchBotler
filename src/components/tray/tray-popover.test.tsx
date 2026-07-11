import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックする。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import type { Device } from "@/data";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { TrayPopover } from "./tray-popover";

function plug(n: number): Device {
  return {
    id: `plug-${n}`,
    name: `プラグ${n}`,
    model: "Plug Mini (JP)",
    category: "plug",
    supported: true,
    controls: { power: false },
  };
}

describe("TrayPopover", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue([]); // list_scenes 等の既定
    useConnectionStore.setState({
      connection: {
        status: "connected",
        lastCheckedAt: null,
        saved: true,
        rateLimit: 10000,
      },
      loaded: true,
    });
    useDeviceStore.setState({
      devices: [plug(1), plug(2), plug(3), plug(4), plug(5)],
      loading: false,
      loaded: true,
      error: null,
    });
    useFavoritesStore.setState({
      deviceIds: new Set(["plug-5"]),
      sceneIds: new Set(),
      loaded: true,
    });
  });

  it("お気に入りを先頭に寄せ、上限 4 件で先頭補完する", async () => {
    render(<TrayPopover />);

    const switches = await screen.findAllByRole("switch");
    expect(switches).toHaveLength(4);
    // お気に入り plug-5 が先頭、次に先頭から plug-1..plug-3（plug-4 は上限で除外）。
    const names = switches.map((s) => s.getAttribute("aria-label"));
    expect(names).toEqual(["プラグ5", "プラグ1", "プラグ2", "プラグ3"]);
  });

  it("フッタがトレイの Tauri コマンドへ結線されている", async () => {
    const user = userEvent.setup();
    render(<TrayPopover />);

    await user.click(screen.getByRole("button", { name: "ウィンドウを開く" }));
    expect(invoke).toHaveBeenCalledWith("show_main_window", { view: null });
    expect(invoke).toHaveBeenCalledWith("hide_tray_popup");

    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(invoke).toHaveBeenCalledWith("show_main_window", { view: "settings" });

    await user.click(screen.getByRole("button", { name: "終了" }));
    expect(invoke).toHaveBeenCalledWith("quit");
  });

  it("未接続かつデバイス無しなら未接続の案内を出す", async () => {
    useConnectionStore.setState({
      connection: {
        status: "disconnected",
        lastCheckedAt: null,
        saved: false,
        rateLimit: 10000,
      },
      loaded: true,
    });
    useDeviceStore.setState({ devices: [], loading: false, loaded: true, error: null });

    render(<TrayPopover />);

    expect(
      await screen.findByText("未接続です。設定から接続してください。"),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByRole("switch")).toHaveLength(0));
  });

  it("クイックデバイスのトグルで send_command を送る", async () => {
    const user = userEvent.setup();
    render(<TrayPopover />);

    const list = await screen.findAllByRole("switch");
    await user.click(list[0]); // お気に入り plug-5

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("send_command", {
        id: "plug-5",
        command: "turnOn",
        parameter: "default",
        commandType: "command",
      }),
    );
  });
});
