import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックし、カード〜ストア〜データ層の
// 結線は実物を通す（実 API 非依存）。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import type { Device } from "@/data";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceCard } from "./device-card";

const plug: Device = {
  id: "circulator",
  name: "サーキュレーター",
  model: "Plug Mini (JP)",
  category: "plug",
  supported: true,
  controls: { power: false },
};

const curtain: Device = {
  id: "bedroom-curtain",
  name: "寝室のカーテン",
  model: "Curtain3",
  category: "curtain",
  supported: true,
  controls: { power: true, position: 80 },
};

const meter: Device = {
  id: "living-meter",
  name: "リビングの温湿度計",
  model: "Meter",
  category: "other",
  supported: false,
  controls: { power: false },
};

describe("DeviceCard", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(null);
    useDeviceStore.setState({ devices: [], loading: false, loaded: false, error: null });
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
    useFavoritesStore.setState({ deviceIds: new Set(), sceneIds: new Set(), loaded: true });
  });

  it("toggle 型カードのスイッチ操作で電源が反転し turnOn コマンドを送る", async () => {
    useDeviceStore.setState({ devices: [plug] });
    render(<DeviceCard device={plug} />);

    await userEvent.click(screen.getByRole("switch", { name: "サーキュレーター" }));

    await waitFor(() => {
      const updated = useDeviceStore.getState().devices.find((d) => d.id === "circulator");
      expect(updated?.controls.power).toBe(true);
    });
    expect(invoke).toHaveBeenCalledWith("send_command", {
      id: "circulator",
      command: "turnOn",
      parameter: "default",
      commandType: "command",
    });
  });

  it("コマンド失敗時は楽観更新をロールバックしエラーを保持する", async () => {
    invoke.mockRejectedValue({ code: "rateLimited", message: "リクエストが多すぎます。" });
    useDeviceStore.setState({ devices: [plug] });
    render(<DeviceCard device={plug} />);

    await userEvent.click(screen.getByRole("switch", { name: "サーキュレーター" }));

    await waitFor(() => {
      const state = useDeviceStore.getState();
      expect(state.devices.find((d) => d.id === "circulator")?.controls.power).toBe(false);
      expect(state.error).toBe("リクエストが多すぎます。");
    });
  });

  it("detail 型カードの chevron で該当デバイスの詳細へ navigate する", async () => {
    render(<DeviceCard device={curtain} />);

    await userEvent.click(screen.getByRole("button", { name: "寝室のカーテン の詳細" }));

    const nav = useNavigationStore.getState();
    expect(nav.activeView).toBe("devices");
    expect(nav.selectedDeviceId).toBe("bedroom-curtain");
  });

  it("未対応デバイスは操作要素（スイッチ・詳細）を出さず「未対応」表示にする", () => {
    render(<DeviceCard device={meter} />);
    expect(screen.getByText("未対応")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
    // 詳細への chevron は無い（お気に入りのピン留めは全カード共通で残る）。
    expect(
      screen.queryByRole("button", { name: /の詳細$/ }),
    ).toBeNull();
  });

  it("ピン留めボタンでお気に入りを追加・解除する", async () => {
    useDeviceStore.setState({ devices: [plug] });
    render(<DeviceCard device={plug} />);

    await userEvent.click(
      screen.getByRole("button", { name: "サーキュレーター をお気に入り" }),
    );
    expect(useFavoritesStore.getState().deviceIds.has("circulator")).toBe(true);

    await userEvent.click(
      screen.getByRole("button", { name: "サーキュレーター のお気に入りを解除" }),
    );
    expect(useFavoritesStore.getState().deviceIds.has("circulator")).toBe(false);
  });
});
