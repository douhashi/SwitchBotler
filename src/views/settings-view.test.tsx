import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLanguageStore } from "@/stores/language-store";

// Tauri IPC（invoke）は外部境界。ここだけをモックし、ゲートウェイ〜ストア〜
// view の結線は実物を通す。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { useConnectionStore } from "@/stores/connection-store";
import { SettingsView } from "./settings-view";

/** keyring に見立てた保存状態。invoke モックがこれを読み書きする。 */
let saved = false;

beforeEach(() => {
  saved = false;
  invoke.mockReset();
  invoke.mockImplementation(async (cmd: string) => {
    switch (cmd) {
      case "get_connection_state":
        return { saved };
      case "save_credentials":
        saved = true;
        return null;
      case "test_connection":
        return { saved };
      case "disconnect":
        saved = false;
        return null;
      default:
        throw new Error(`unexpected command: ${cmd}`);
    }
  });
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

describe("SettingsView", () => {
  it("Token/Secret を入力して保存すると保存＋接続テストが走り接続済みになる", async () => {
    render(<SettingsView />);

    // 初期ロードで未接続バナー。
    await screen.findByText("未接続");

    await userEvent.type(screen.getByLabelText("トークン"), "my-token");
    await userEvent.type(screen.getByLabelText("シークレット"), "my-secret");

    await userEvent.click(screen.getByRole("button", { name: /保存して接続/ }));

    // 保存 → 接続テスト成功で接続済みになる。
    await screen.findByText("接続済み");
    expect(invoke).toHaveBeenCalledWith("save_credentials", {
      token: "my-token",
      secret: "my-secret",
    });
    expect(invoke).toHaveBeenCalledWith("test_connection");

    const state = useConnectionStore.getState().connection;
    expect(state.status).toBe("connected");
    expect(state.saved).toBe(true);

    // 平文はフィールドに残らない（保存後にクリアされる）。
    expect((screen.getByLabelText("トークン") as HTMLInputElement).value).toBe("");
  });

  it("接続テスト失敗時は未接続に戻りエラーメッセージを表示する", async () => {
    saved = true;
    useConnectionStore.setState({
      loaded: true,
      connection: { status: "connected", lastCheckedAt: "10:00", saved: true, rateLimit: 10000 },
    });
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "test_connection") {
        // Rust の SwitchBotError シリアライズ形（秘匿値なし）を模す。
        return Promise.reject({ code: "unauthorized", message: "認証に失敗しました。" });
      }
      return { saved };
    });

    render(<SettingsView />);

    await userEvent.click(screen.getByRole("button", { name: /接続をテスト/ }));

    await screen.findByText("認証に失敗しました。");
    expect(useConnectionStore.getState().connection.status).toBe("disconnected");
  });

  it("接続解除は AlertDialog の確認を挟んでから実行される", async () => {
    saved = true;
    useConnectionStore.setState({
      loaded: true,
      connection: { status: "connected", lastCheckedAt: "10:00", saved: true, rateLimit: 10000 },
    });

    render(<SettingsView />);

    await screen.findByText("接続済み");

    await userEvent.click(screen.getByRole("button", { name: /接続を解除/ }));

    const confirm = await screen.findByRole("button", { name: "解除する" });
    expect(useConnectionStore.getState().connection.status).toBe("connected");

    await userEvent.click(confirm);

    await waitFor(() => {
      expect(useConnectionStore.getState().connection.status).toBe("disconnected");
    });
    expect(useConnectionStore.getState().connection.saved).toBe(false);
  });
});

describe("SettingsView 言語切替", () => {
  afterEach(() => {
    // 言語状態は i18n グローバルへ反映されるため既定へ戻す。
    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });
  });

  it("言語を切り替えるとリロードせずパイロット文言が即時に切り替わる", async () => {
    render(<SettingsView />);

    // ja へ切替 → 日本語の見出し・言語ラベルが現れる。
    act(() => {
      useLanguageStore.getState().setLanguage("ja");
    });
    expect(await screen.findByRole("heading", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByText("言語")).toBeInTheDocument();

    // en へ切替 → 同じ要素が英語表記へ再描画される（リロードなし）。
    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });
    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
  });
});
