import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import type { Device } from "@/data";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { AppShell } from "./app-shell";

const light: Device = {
  id: "living-light",
  name: "リビングの照明",
  model: "Color Bulb",
  category: "light",
  supported: true,
  controls: { power: true, brightness: 72, colorId: "warm" },
};

describe("AppShell トレイポップオーバー", () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
    // 一覧取得済み（loaded=true）にして再取得を抑止し、トレイに出す 1 台を用意する。
    useDeviceStore.setState({ devices: [light], loading: false, loaded: true, error: null });
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
