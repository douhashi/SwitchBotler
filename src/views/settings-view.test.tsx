import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useConnectionStore } from "@/stores/connection-store";
import { SettingsView } from "./settings-view";

describe("SettingsView", () => {
  beforeEach(() => {
    useConnectionStore.setState({
      loaded: false,
      connection: {
        status: "disconnected",
        lastCheckedAt: null,
        rateRemaining: 0,
        rateLimit: 10000,
        tokenMasked: "",
        secretMasked: "",
      },
    });
  });

  it("接続解除は AlertDialog の確認を挟んでから実行される", async () => {
    render(<SettingsView />);

    // mount 時に接続状態をロードし、接続済みバナーが出る。
    await screen.findByText("接続済み");

    await userEvent.click(
      screen.getByRole("button", { name: /接続を解除/ }),
    );

    // 確認ダイアログが開くが、この時点では解除されていない。
    const confirm = await screen.findByRole("button", { name: "解除する" });
    expect(useConnectionStore.getState().connection.status).toBe("connected");

    await userEvent.click(confirm);

    await waitFor(() => {
      expect(useConnectionStore.getState().connection.status).toBe(
        "disconnected",
      );
    });
  });
});
