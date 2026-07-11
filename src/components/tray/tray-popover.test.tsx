import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックする。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import type { Device } from "@/data";
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

const curtain: Device = {
  id: "bedroom-curtain",
  name: "寝室のカーテン",
  model: "Curtain3",
  category: "curtain",
  supported: true,
  controls: { power: true, position: 80 },
};

const aircon: Device = {
  id: "living-aircon",
  name: "リビングのエアコン",
  model: "Air Conditioner",
  category: "aircon",
  supported: true,
  controls: { power: true, temperature: 26, mode: "cool", fanSpeed: "auto" },
};

const pressBot: Device = {
  id: "curtain-bot",
  name: "カーテンの Bot",
  model: "Bot",
  category: "bot",
  supported: true,
  controls: { power: false, botMode: "press" },
};

describe("TrayPopover", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue([]); // list_scenes 等の既定
    // 接続表示は device 取得の成否で判定する（loaded && !error = 接続済み扱い）。
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

  it("お気に入りデバイスのみを表示する（補完しない）", async () => {
    render(<TrayPopover />);

    const switches = await screen.findAllByRole("switch");
    expect(switches).toHaveLength(1);
    expect(switches[0].getAttribute("aria-label")).toBe("プラグ5");
  });

  it("接続済みでもお気に入りが無ければ空表示を出す", async () => {
    useFavoritesStore.setState({
      deviceIds: new Set(),
      sceneIds: new Set(),
      loaded: true,
    });

    render(<TrayPopover />);

    expect(
      await screen.findByText("お気に入りデバイスがありません"),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByRole("switch")).toHaveLength(0));
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

  it("デバイス取得に失敗（到達不能）なら未接続の案内を出す", async () => {
    // 接続表示は device 取得の成否で判定する。エラー = 未接続扱い。
    useDeviceStore.setState({
      devices: [],
      loading: false,
      loaded: true,
      error: "network",
    });

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

  it("detail 型デバイス（カーテン）は電源トグルを出さず状態ラベルと「>」を出す", async () => {
    useDeviceStore.setState({ devices: [curtain], error: null });
    useFavoritesStore.setState({
      deviceIds: new Set(["bedroom-curtain"]),
      sceneIds: new Set(),
      loaded: true,
    });

    render(<TrayPopover />);

    // detail 型はトグルを出さない。
    await waitFor(() => expect(screen.queryAllByRole("switch")).toHaveLength(0));
    // 状態サブラベル（status のみ、model 前置なし）。
    expect(screen.getByText("80% 開")).toBeInTheDocument();
    // 右端の「>」ボタンが出る。
    expect(
      screen.getByRole("button", { name: "寝室のカーテン の詳細" }),
    ).toBeInTheDocument();
  });

  it("detail 型の「>」でメイン前面化 + 該当デバイス詳細遷移を invoke する", async () => {
    const user = userEvent.setup();
    useDeviceStore.setState({ devices: [aircon], error: null });
    useFavoritesStore.setState({
      deviceIds: new Set(["living-aircon"]),
      sceneIds: new Set(),
      loaded: true,
    });

    render(<TrayPopover />);

    // 運転中エアコンは「冷房 26℃」を状態ラベルに出す。
    expect(await screen.findByText("冷房 26℃")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "リビングのエアコン の詳細" }));

    expect(invoke).toHaveBeenCalledWith("show_main_window", {
      view: "devices",
      deviceId: "living-aircon",
    });
    expect(invoke).toHaveBeenCalledWith("hide_tray_popup");
  });

  it("press 型デバイス（pressMode の Bot）は「押す」ボタンで press コマンドを送る", async () => {
    const user = userEvent.setup();
    useDeviceStore.setState({ devices: [pressBot], error: null });
    useFavoritesStore.setState({
      deviceIds: new Set(["curtain-bot"]),
      sceneIds: new Set(),
      loaded: true,
    });

    render(<TrayPopover />);

    // press 型はトグルを出さない。
    await waitFor(() => expect(screen.queryAllByRole("switch")).toHaveLength(0));

    await user.click(screen.getByRole("button", { name: "カーテンの Bot を押す" }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("send_command", {
        id: "curtain-bot",
        command: "press",
        parameter: "default",
        commandType: "command",
      }),
    );
  });
});
