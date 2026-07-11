import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { AppShell } from "./app-shell";

describe("AppShell トレイポップオーバー", () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
    useDeviceStore.setState({ devices: [], loading: false, loaded: false });
    useConnectionStore.setState({ loaded: false });
  });

  it("トリガでポップオーバーが開き、Escape で閉じる", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(
      screen.getByRole("button", { name: "クイックコントロール" }),
    );

    // リビングの照明は一覧では詳細型（chevron）だが、トレイでは即トグルできる。
    // → switch ロールで名前一致するのはトレイ内のみ。
    expect(
      await screen.findByRole("switch", { name: "リビングの照明" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("switch", { name: "リビングの照明" }),
      ).not.toBeInTheDocument();
    });
  });
});
