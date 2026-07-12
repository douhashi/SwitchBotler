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

const aircon: Device = {
  id: "living-aircon",
  name: "リビングのエアコン",
  model: "Air Conditioner",
  category: "aircon",
  supported: true,
  controls: { power: true, temperature: 26, mode: "cool", fanSpeed: "auto" },
};

const irLight: Device = {
  id: "living-light",
  name: "リビングの間接照明",
  model: "Light",
  category: "ir_light",
  supported: true,
  controls: { power: true },
};

const switchBot: Device = {
  id: "coffee-bot",
  name: "コーヒーメーカーの Bot",
  model: "Bot",
  category: "bot",
  supported: true,
  controls: { power: false, botMode: "switch" },
};

const pressBot: Device = {
  id: "curtain-bot",
  name: "カーテンの Bot",
  model: "Bot",
  category: "bot",
  supported: true,
  controls: { power: false, botMode: "press" },
};

describe("DeviceCard", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(null);
    useDeviceStore.setState({
      devices: [],
      loading: false,
      loaded: false,
      error: null,
      offlineIds: new Set(),
    });
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
    useFavoritesStore.setState({ deviceIds: [], sceneIds: [], loaded: true });
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
      // ストアは日本語でなく安定コードを保持する（表示端で翻訳）。
      expect(state.error).toBe("rateLimited");
    });
  });

  it("detail 型カードの chevron で該当デバイスの詳細へ navigate する", async () => {
    render(<DeviceCard device={curtain} />);

    await userEvent.click(screen.getByRole("button", { name: "寝室のカーテン の詳細" }));

    const nav = useNavigationStore.getState();
    expect(nav.activeView).toBe("devices");
    expect(nav.selectedDeviceId).toBe("bedroom-curtain");
  });

  it("エアコンカードは電源トグルを出さず detail 経路（chevron）と運転状態ラベルを出す", async () => {
    render(<DeviceCard device={aircon} />);

    // カード上に電源スイッチは無い（電源は詳細内で setAll 操作するため）。
    expect(screen.queryByRole("switch")).toBeNull();
    // 運転中は「冷房 26℃」ラベル。
    expect(screen.getByText(/冷房 26℃/)).toBeInTheDocument();

    // chevron で詳細へ遷移する。
    await userEvent.click(screen.getByRole("button", { name: "リビングのエアコン の詳細" }));
    expect(useNavigationStore.getState().selectedDeviceId).toBe("living-aircon");
  });

  it("赤外線ライトカードは電源トグルを出さず detail 経路（chevron）と点灯/消灯ラベルを出す", async () => {
    render(<DeviceCard device={irLight} />);

    // カード上に電源スイッチは無い（電源・明暗は詳細内で action 送信するため）。
    expect(screen.queryByRole("switch")).toBeNull();
    // 点灯中は「点灯」ラベル。
    expect(screen.getByText(/点灯/)).toBeInTheDocument();

    // chevron で詳細へ遷移する。
    await userEvent.click(screen.getByRole("button", { name: "リビングの間接照明 の詳細" }));
    expect(useNavigationStore.getState().selectedDeviceId).toBe("living-light");
  });

  it("switchMode の Bot カードは電源トグル（Switch）を出し「押す」ボタンは出さない", async () => {
    useDeviceStore.setState({ devices: [switchBot] });
    render(<DeviceCard device={switchBot} />);

    // switchMode は従来どおり ON/OFF トグル。
    expect(
      screen.getByRole("switch", { name: "コーヒーメーカーの Bot" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /を押す$/ })).toBeNull();

    await userEvent.click(screen.getByRole("switch", { name: "コーヒーメーカーの Bot" }));
    expect(invoke).toHaveBeenCalledWith("send_command", {
      id: "coffee-bot",
      command: "turnOn",
      parameter: "default",
      commandType: "command",
    });
  });

  it("pressMode の Bot カードは「押す」ボタンを出し press コマンドを送る", async () => {
    useDeviceStore.setState({ devices: [pressBot] });
    render(<DeviceCard device={pressBot} />);

    // pressMode は電源トグルを出さず「押す」ボタン。中立ラベルも出す。
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByText(/押して操作/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "カーテンの Bot を押す" }));
    expect(invoke).toHaveBeenCalledWith("send_command", {
      id: "curtain-bot",
      command: "press",
      parameter: "default",
      commandType: "command",
    });
  });

  it("オフライン機はグレーアウトし「オフライン」表記 + トグル無効で描画する", async () => {
    useDeviceStore.setState({ devices: [plug], offlineIds: new Set(["circulator"]) });
    render(<DeviceCard device={plug} />);

    // 色だけに頼らず「オフライン」表記を出す（サブ行併記 + ピル）。
    expect(screen.getAllByText(/オフライン/).length).toBeGreaterThan(0);
    // トグルは無効化される（操作抑止）。
    const toggleSwitch = screen.getByRole("switch", { name: "サーキュレーター" });
    expect(toggleSwitch).toBeDisabled();

    // 無効化されたトグルをクリックしても電源は変わらずコマンドも送られない。
    await userEvent.click(toggleSwitch).catch(() => {});
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "circulator")?.controls.power,
    ).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  // お気に入りのピンは廃止した。カードのコントロール枠は「その機器の操作」だけを持つ
  // （幅の違う操作系と管理ボタンが並ばないので、横位置がズレる問題が起きない）。
  // 登録・解除はお気に入りセクションへの D&D とコンテキストメニューが担い、
  // その検証は devices-view.test.tsx で行う。
});
