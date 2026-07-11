import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックする。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import type { Scene } from "@/data";
import { SceneRow } from "./scene-row";

const scene: Scene = { id: "goodnight", name: "おやすみ" };

describe("SceneRow", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("実行ボタンで実行中フィードバックを表示し、完了後に戻る", async () => {
    // 実行中状態を観測するため、テストが解決を制御する deferred を使う。
    let resolveExec!: () => void;
    invoke.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveExec = () => resolve(null);
      }),
    );
    render(<SceneRow scene={scene} />);

    await userEvent.click(screen.getByRole("button", { name: "実行" }));

    expect(screen.getByRole("button", { name: "実行中" })).toBeDisabled();

    resolveExec();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "実行" })).toBeEnabled();
    });
    expect(invoke).toHaveBeenCalledWith("execute_scene", { id: "goodnight" });
  });

  it("実行失敗時は安全なエラーメッセージ（コードを翻訳）を表示する", async () => {
    invoke.mockRejectedValue({ code: "network", message: "network failure" });
    render(<SceneRow scene={scene} />);

    await userEvent.click(screen.getByRole("button", { name: "実行" }));

    // ストアは message でなく code を持ち、表示端が errors namespace で翻訳する（ja）。
    await screen.findByText(
      "SwitchBot API に接続できませんでした。ネットワーク接続を確認してください。",
    );
    expect(screen.getByRole("button", { name: "実行" })).toBeEnabled();
  });
});
