import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Tauri IPC（invoke）は外部境界。ここだけをモックし、ゲートウェイ〜ストア〜
// シェルの結線は実物を通す。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

// Rust が emit するイベント（navigate 等）の結線を検証するため、setup.ts の no-op
// window モックをこのファイル用に差し替え、登録された listener を捕捉できるようにする。
const { eventListeners } = vi.hoisted(() => ({
  eventListeners: new Map<string, (event: { payload: unknown }) => void>(),
}));
vi.mock("@tauri-apps/api/window", () => {
  const noopUnlisten = () => {};
  const currentWindow = {
    label: "main",
    listen: async (event: string, handler: (e: { payload: unknown }) => void) => {
      eventListeners.set(event, handler);
      return noopUnlisten;
    },
    onFocusChanged: async () => noopUnlisten,
    onCloseRequested: async () => noopUnlisten,
    show: async () => {},
    hide: async () => {},
    setFocus: async () => {},
    unminimize: async () => {},
  };
  return { getCurrentWindow: () => currentWindow };
});

import App from "./App";
import { useConnectionStore } from "@/stores/connection-store";
import { useNavigationStore } from "@/stores/navigation-store";

const NAV_LABELS = ["デバイス", "センサー", "シーン", "設定"];

/** 接続済み（saved:true）の状態を seed する。シェル描画を前提とするテスト用。 */
function seedConnected() {
  useConnectionStore.setState({
    loaded: true,
    error: null,
    connection: {
      status: "connected",
      lastCheckedAt: "10:00",
      saved: true,
      rateLimit: 10000,
    },
  });
}

beforeEach(() => {
  // view-state のシングルトンをテスト間で初期化する。
  useNavigationStore.setState({
    activeView: "devices",
    selectedDeviceId: null,
  });
  eventListeners.clear();
  invoke.mockReset();
  invoke.mockImplementation(async (cmd: string) => {
    switch (cmd) {
      case "get_connection_state":
        return { saved: false };
      case "list_devices":
      case "list_scenes":
        return [];
      case "get_sensors":
        return { source: "", metrics: [] };
      default:
        return null;
    }
  });
});

describe("App シェル（接続済み）", () => {
  beforeEach(() => {
    seedConnected();
  });

  it("4つのナビ項目を描画する", async () => {
    render(<App />);
    // 画面の初回データ取得（空データ）が落ち着くのを待ってから検証する。
    const nav = await screen.findByRole("navigation", { name: "メインナビゲーション" });
    await screen.findByText("デバイスが見つかりませんでした。");
    for (const label of NAV_LABELS) {
      expect(
        within(nav).getByRole("button", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("初期表示はデバイス画面で、その項目に aria-current が付く", async () => {
    render(<App />);
    await screen.findByText("デバイスが見つかりませんでした。");
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
    await screen.findByText("デバイスが見つかりませんでした。");
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });

    await user.click(within(nav).getByRole("button", { name: "センサー" }));

    expect(useNavigationStore.getState().activeView).toBe("sensors");
    expect(
      within(nav).getByRole("button", { name: "センサー" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("button", { name: "デバイス" }),
    ).not.toHaveAttribute("aria-current");
    // センサー画面の空データ取得が落ち着くのを待つ。
    await screen.findByRole("heading", { name: "センサー" });
  });

  it("navigate イベントは画面遷移のみで selectedDeviceId を残さない（V1）", async () => {
    // 直前に詳細を選択していても、view のみの navigate で選択は解除される。
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: "x" });
    render(<App />);
    await screen.findByText("デバイスが見つかりませんでした。");

    await waitFor(() => expect(eventListeners.has("navigate")).toBe(true));

    act(() => {
      eventListeners.get("navigate")?.({ payload: { view: "settings" } });
    });

    const nav = useNavigationStore.getState();
    expect(nav.activeView).toBe("settings");
    expect(nav.selectedDeviceId).toBeNull();
  });
});

describe("App 分岐（接続状態でシェル / オンボーディングを切替）", () => {
  beforeEach(() => {
    // 各テストの前提を明示するため、接続 store を未ロード初期状態へ戻す。
    useConnectionStore.setState({
      loaded: false,
      error: null,
      connection: {
        status: "disconnected",
        lastCheckedAt: null,
        saved: false,
        rateLimit: 10000,
      },
    });
  });

  it("未設定（saved:false）ではオンボーディングを表示し、サイドバーは出さない", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "SwitchBotler へようこそ" });
    expect(
      screen.queryByRole("navigation", { name: "メインナビゲーション" }),
    ).not.toBeInTheDocument();
  });

  it("設定済み（saved:true）ではサイドバーを出し、オンボーディングは出さない", async () => {
    seedConnected();

    render(<App />);

    await screen.findByRole("navigation", { name: "メインナビゲーション" });
    expect(screen.queryByRole("heading", { name: "SwitchBotler へようこそ" })).not.toBeInTheDocument();
  });

  it("saved:true かつ到達不能（disconnected）でもシェルを維持しオンボーディングに入らない（V1）", async () => {
    useConnectionStore.setState({
      loaded: true,
      error: "network",
      connection: {
        status: "disconnected",
        lastCheckedAt: null,
        saved: true,
        rateLimit: 10000,
      },
    });

    render(<App />);

    await screen.findByRole("navigation", { name: "メインナビゲーション" });
    expect(screen.queryByRole("heading", { name: "SwitchBotler へようこそ" })).not.toBeInTheDocument();
  });

  it("ロード前（loaded:false）はオンボーディングもシェルも描画しない（ちらつき防止・V2）", () => {
    // load() が解決するまでの一瞬を模すため、invoke を未解決のままにする。
    invoke.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<App />);

    expect(screen.queryByRole("heading", { name: "SwitchBotler へようこそ" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "メインナビゲーション" }),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("未設定から保存→接続成功でシェルへ自動遷移する（navigation が現れる・V2）", async () => {
    // keyring 保存を模す。save 後は saved:true を返し test_connection が成功する。
    let saved = false;
    invoke.mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case "get_connection_state":
          return { saved };
        case "save_credentials":
          saved = true;
          return null;
        case "test_connection":
          return { saved };
        case "list_devices":
        case "list_scenes":
          return [];
        case "get_sensors":
          return { source: "", metrics: [] };
        default:
          return null;
      }
    });

    render(<App />);

    // まずはオンボーディングが表示される。
    await screen.findByRole("heading", { name: "SwitchBotler へようこそ" });

    await userEvent.type(screen.getByLabelText("トークン"), "my-token");
    await userEvent.type(screen.getByLabelText("シークレット"), "my-secret");
    await userEvent.click(screen.getByRole("button", { name: /保存して接続/ }));

    // 接続成功で saved:true となり、通常シェル（サイドバー）へ自動遷移する。
    await screen.findByRole("navigation", { name: "メインナビゲーション" });
    expect(screen.queryByRole("heading", { name: "SwitchBotler へようこそ" })).not.toBeInTheDocument();
  });
});
