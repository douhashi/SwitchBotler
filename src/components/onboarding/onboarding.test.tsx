import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックし、ゲートウェイ〜ストア〜
// コンポーネントの結線は実物を通す。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { useConnectionStore } from "@/stores/connection-store";
import { Onboarding } from "./onboarding";

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
    loaded: true,
    error: null,
    connection: {
      status: "disconnected",
      lastCheckedAt: null,
      saved: false,
      rateLimit: 10000,
    },
  });
});

describe("Onboarding", () => {
  it("未入力では「保存して接続」ボタンが無効", () => {
    render(<Onboarding />);
    expect(screen.getByRole("button", { name: /保存して接続/ })).toBeDisabled();
  });

  it("Token/Secret を入力して保存すると save_credentials と test_connection が走る", async () => {
    render(<Onboarding />);

    await userEvent.type(screen.getByLabelText("トークン"), "my-token");
    await userEvent.type(screen.getByLabelText("シークレット"), "my-secret");

    await userEvent.click(screen.getByRole("button", { name: /保存して接続/ }));

    await screen.findByRole("heading", { name: "SwitchBotler へようこそ" });

    expect(invoke).toHaveBeenCalledWith("save_credentials", {
      token: "my-token",
      secret: "my-secret",
    });
    expect(invoke).toHaveBeenCalledWith("test_connection");

    const state = useConnectionStore.getState().connection;
    expect(state.status).toBe("connected");
    expect(state.saved).toBe(true);
  });

  it("保存後に入力フィールドが空へ戻る（平文を残さない）", async () => {
    render(<Onboarding />);

    await userEvent.type(screen.getByLabelText("トークン"), "my-token");
    await userEvent.type(screen.getByLabelText("シークレット"), "my-secret");

    await userEvent.click(screen.getByRole("button", { name: /保存して接続/ }));

    expect((screen.getByLabelText("トークン") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("シークレット") as HTMLInputElement).value).toBe("");
  });

  it("接続テスト失敗時はエラーメッセージを表示する", async () => {
    invoke.mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case "save_credentials":
          return null;
        case "test_connection":
          // Rust の SwitchBotError シリアライズ形（秘匿値なし）を模す。
          return Promise.reject({ code: "unauthorized", message: "認証に失敗しました。" });
        default:
          return { saved };
      }
    });

    render(<Onboarding />);

    await userEvent.type(screen.getByLabelText("トークン"), "bad-token");
    await userEvent.type(screen.getByLabelText("シークレット"), "bad-secret");

    await userEvent.click(screen.getByRole("button", { name: /保存して接続/ }));

    // ストアは code（unauthorized）を保持し、表示端が errors namespace で翻訳する（ja）。
    await screen.findByText("認証情報またはリクエスト上限を確認してください。");
    expect(useConnectionStore.getState().connection.status).toBe("disconnected");
  });
});
