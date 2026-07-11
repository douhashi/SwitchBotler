import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import type { Device } from "@/data";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceCard } from "./device-card";

const circulator: Device = {
  id: "circulator",
  name: "サーキュレーター",
  model: "Plug Mini",
  room: "リビング",
  category: "fan",
  controls: { power: false },
};

const curtain: Device = {
  id: "bedroom-curtain",
  name: "寝室のカーテン",
  model: "Curtain 3",
  room: "寝室",
  category: "curtain",
  controls: { power: true, position: 80 },
};

describe("DeviceCard", () => {
  beforeEach(() => {
    useDeviceStore.setState({ devices: [], loading: false, loaded: false });
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
  });

  it("toggle 型カードのスイッチ操作で device-store の電源が反転する", async () => {
    useDeviceStore.setState({ devices: [circulator] });
    render(<DeviceCard device={circulator} />);

    await userEvent.click(screen.getByRole("switch", { name: "サーキュレーター" }));

    await waitFor(() => {
      const updated = useDeviceStore
        .getState()
        .devices.find((d) => d.id === "circulator");
      expect(updated?.controls.power).toBe(true);
    });
  });

  it("detail 型カードの chevron で該当デバイスの詳細へ navigate する", async () => {
    render(<DeviceCard device={curtain} />);

    await userEvent.click(
      screen.getByRole("button", { name: "寝室のカーテン の詳細" }),
    );

    const nav = useNavigationStore.getState();
    expect(nav.activeView).toBe("devices");
    expect(nav.selectedDeviceId).toBe("bedroom-curtain");
  });
});
