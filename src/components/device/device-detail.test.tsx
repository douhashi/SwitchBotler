import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックし、詳細UI〜ストア〜データ層の
// 結線は実物を通す（device-card.test と同方針）。plugin-store は setup.ts が
// プロセス内メモリで模す。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import type { Device } from "@/data";
import { useDeviceStore } from "@/stores/device-store";
import { useLanguageStore } from "@/stores/language-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceDetail } from "./device-detail";

/**
 * devices-view と同じく store 購読でデバイスを引き直す最小ハーネス。
 * DeviceDetail 自体は props のデバイスを描画するため、再描画の結線を親と同形で再現する。
 */
function Harness({ id }: { id: string }) {
  const device = useDeviceStore((s) => s.devices.find((d) => d.id === id));
  return device ? <DeviceDetail device={device} /> : null;
}

function airconWith(controls: Partial<Device["controls"]>): Device {
  return {
    id: "living-aircon",
    name: "リビングのエアコン",
    model: "Air Conditioner",
    category: "aircon",
    supported: true,
    controls: {
      power: true,
      temperature: 26,
      mode: "cool",
      fanSpeed: "auto",
      ...controls,
    },
  };
}

function seed(device: Device, offline = false) {
  useDeviceStore.setState({
    devices: [device],
    loading: false,
    loaded: true,
    error: null,
    offlineIds: offline ? new Set([device.id]) : new Set(),
  });
}

const currentTemp = () =>
  useDeviceStore.getState().devices.find((d) => d.id === "living-aircon")?.controls
    .temperature;
const lastAircon = () => {
  const calls = invoke.mock.calls.filter(([cmd]) => cmd === "send_aircon");
  return calls[calls.length - 1]?.[1];
};

describe("DeviceDetail エアコン", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(null);
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
  });

  afterEach(() => {
    act(() => {
      useLanguageStore.getState().setLanguage("ja");
    });
  });

  it("＋押下で温度が +1 され setAll 送信ペイロードへ反映する（V3）", async () => {
    seed(airconWith({ temperature: 26 }));
    render(<Harness id="living-aircon" />);

    await userEvent.click(screen.getByRole("button", { name: "温度を上げる" }));

    await waitFor(() => expect(currentTemp()).toBe(27));
    expect(screen.getByText("27")).toBeInTheDocument();
    // 送信引数（send_aircon）は現行仕様のまま。温度以外はそのまま同梱される。
    expect(lastAircon()).toEqual({
      id: "living-aircon",
      temperature: 27,
      mode: "cool",
      fanSpeed: "auto",
      power: true,
    });
  });

  it("上限 30℃ / 下限 16℃ でクランプする（V3）", async () => {
    seed(airconWith({ temperature: 30 }));
    const { unmount } = render(<Harness id="living-aircon" />);

    await userEvent.click(screen.getByRole("button", { name: "温度を上げる" }));
    await waitFor(() => expect(lastAircon()?.temperature).toBe(30));
    expect(currentTemp()).toBe(30);
    unmount();

    seed(airconWith({ temperature: 16 }));
    render(<Harness id="living-aircon" />);
    await userEvent.click(screen.getByRole("button", { name: "温度を下げる" }));
    await waitFor(() => expect(lastAircon()?.temperature).toBe(16));
    expect(currentTemp()).toBe(16);
  });

  it("モード切替でチップ・選択状態・アクセント色が連動し mode を更新する", async () => {
    seed(airconWith({ mode: "cool" }));
    render(<Harness id="living-aircon" />);

    const modeGroup = screen.getByRole("radiogroup", { name: "モード" });
    // 初期は冷房が選択されアクセント色は --m-cool。
    expect(within(modeGroup).getByRole("radio", { name: "冷房" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const hero = screen.getByText("26");
    expect(hero.className).toContain("text-[var(--m)]");
    const accented = hero.closest('div[style*="--m"]');
    expect(accented?.getAttribute("style")).toContain("var(--m-cool)");

    // 暖房へ切替 → 選択・チップ・アクセント色が更新され、mode が heat になる。
    await userEvent.click(within(modeGroup).getByRole("radio", { name: "暖房" }));

    await waitFor(() =>
      expect(
        useDeviceStore.getState().devices[0]?.controls.mode,
      ).toBe("heat"),
    );
    expect(within(modeGroup).getByRole("radio", { name: "暖房" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(modeGroup).getByRole("radio", { name: "冷房" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(
      screen.getByText("26").closest('div[style*="--m"]')?.getAttribute("style"),
    ).toContain("var(--m-heat)");
    expect(lastAircon()?.mode).toBe("heat");
  });

  it("送風モードは温度操作を無効化しヒーローを「—」表示にする（温度値は保持・V3）", async () => {
    seed(airconWith({ mode: "fan", temperature: 24 }));
    const { container } = render(<Harness id="living-aircon" />);

    // ヒーローはプレースホルダ「—」。温度数値は出さない。
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("24")).toBeNull();
    // −/＋ ステッパーは無効。
    expect(screen.getByRole("button", { name: "温度を下げる" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "温度を上げる" })).toBeDisabled();
    // 温度スライダーも無効（Radix は data-disabled を付与する）。
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toHaveAttribute("data-disabled");

    // 送風中でも温度値はデータ・API 上保持される（風量変更の送信ペイロードで確認）。
    await userEvent.click(
      within(screen.getByRole("radiogroup", { name: "風量" })).getByRole("radio", {
        name: "強",
      }),
    );
    await waitFor(() => expect(lastAircon()?.fanSpeed).toBe("high"));
    expect(lastAircon()?.temperature).toBe(24);
    expect(currentTemp()).toBe(24);
  });

  it("モードはアイコン＋ラベルで操作でき、風量は自動のみアイコン・弱中強はラベルのみ", async () => {
    seed(airconWith({ fanSpeed: "auto" }));
    render(<Harness id="living-aircon" />);

    // モードは 5 種すべてアイコン＋ラベル（アクセシブル名＝ラベル）。
    const modeGroup = screen.getByRole("radiogroup", { name: "モード" });
    for (const name of ["自動", "冷房", "除湿", "送風", "暖房"]) {
      const radio = within(modeGroup).getByRole("radio", { name });
      expect(radio.querySelector("svg")).not.toBeNull();
    }

    // 風量は自動のみアイコン。弱/中/強はラベルのみ（svg なし）。
    const fanGroup = screen.getByRole("radiogroup", { name: "風量" });
    expect(
      within(fanGroup).getByRole("radio", { name: "自動" }).querySelector("svg"),
    ).not.toBeNull();
    for (const name of ["弱", "中", "強"]) {
      expect(
        within(fanGroup).getByRole("radio", { name }).querySelector("svg"),
      ).toBeNull();
    }
  });

  it("オフライン機はモード・風量・温度操作をすべて無効化する", async () => {
    seed(airconWith({}), true);
    render(<Harness id="living-aircon" />);

    expect(screen.getByRole("button", { name: "温度を上げる" })).toBeDisabled();
    const modeGroup = screen.getByRole("radiogroup", { name: "モード" });
    expect(within(modeGroup).getByRole("radio", { name: "暖房" })).toBeDisabled();
    const fanGroup = screen.getByRole("radiogroup", { name: "風量" });
    expect(within(fanGroup).getByRole("radio", { name: "強" })).toBeDisabled();
  });

  it("英語ロケールではモード・風量・温度操作が英語ラベルで表示・操作できる", async () => {
    seed(airconWith({ mode: "cool" }));
    render(<Harness id="living-aircon" />);

    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });

    const modeGroup = await screen.findByRole("radiogroup", { name: "Mode" });
    expect(within(modeGroup).getByRole("radio", { name: "Heat" })).toBeInTheDocument();
    const fanGroup = screen.getByRole("radiogroup", { name: "Fan speed" });
    expect(within(fanGroup).getByRole("radio", { name: "Auto" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Raise temperature" }));
    await waitFor(() => expect(currentTemp()).toBe(27));
    expect(lastAircon()?.temperature).toBe(27);
  });
});
