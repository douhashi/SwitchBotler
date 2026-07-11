import { beforeEach, describe, expect, it, vi } from "vitest";

// 外部境界（Tauri IPC）は invoke のみモックする。カード〜ストア〜データ層は実物を通す。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

// plugin-store も外部境界。プロセス内メモリで永続を模す（favorites-store.test と同方針）。
const { prefs } = vi.hoisted(() => ({ prefs: new Map<string, unknown>() }));
vi.mock("@tauri-apps/plugin-store", () => ({
  load: async () => ({
    get: async (key: string) => prefs.get(key),
    set: async (key: string, value: unknown) => {
      prefs.set(key, value);
    },
    save: async () => {},
    delete: async (key: string) => prefs.delete(key),
  }),
}));

import type { AirconState, Device, IrLightState } from "@/data";
import { useNoticeStore } from "@/stores/notice-store";
import { useDeviceStore } from "./device-store";

/** Rust が返すエアコン初期値（status なし・build_device デフォルト相当）。 */
const airconDefault: Device = {
  id: "ac1",
  name: "エアコン",
  model: "Air Conditioner",
  category: "aircon",
  supported: true,
  controls: { power: false, temperature: 26, mode: "cool", fanSpeed: "auto" },
};

describe("device-store aircon", () => {
  beforeEach(() => {
    invoke.mockReset();
    prefs.clear();
    useDeviceStore.setState({ devices: [], loading: false, loaded: false, error: null });
  });

  it("refresh は永続化した最終送信値をエアコンの controls に重畳する（V4）", async () => {
    const persisted: AirconState = {
      power: true,
      temperature: 22,
      mode: "heat",
      fanSpeed: "high",
    };
    prefs.set("airconStates", { ac1: persisted });
    // list_devices は初期値を返す（赤外線は status を持たないため）。
    invoke.mockResolvedValueOnce([airconDefault]);

    await useDeviceStore.getState().refresh();

    const device = useDeviceStore.getState().devices.find((d) => d.id === "ac1");
    expect(device?.controls).toMatchObject({
      power: true,
      temperature: 22,
      mode: "heat",
      fanSpeed: "high",
    });
  });

  it("updateControl（エアコン）は全状態を setAll 送信し成功時に永続化する", async () => {
    useDeviceStore.setState({ devices: [airconDefault], loaded: true });
    invoke.mockResolvedValue(null);

    // モードだけ変更 → マージ後の全状態で send_aircon を呼ぶ。
    await useDeviceStore.getState().updateControl("ac1", { mode: "heat" });

    expect(invoke).toHaveBeenCalledWith("send_aircon", {
      id: "ac1",
      temperature: 26,
      mode: "heat",
      fanSpeed: "auto",
      power: false,
    });
    // 「最後に送信した値」が永続化される。
    expect(prefs.get("airconStates")).toEqual({
      ac1: { power: false, temperature: 26, mode: "heat", fanSpeed: "auto" },
    });
    // 楽観更新も反映されている。
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "ac1")?.controls.mode,
    ).toBe("heat");
  });

  it("送信失敗時は楽観更新をロールバックし永続化しない", async () => {
    useDeviceStore.setState({ devices: [airconDefault], loaded: true });
    invoke.mockRejectedValue({ code: "rateLimited", message: "リクエストが多すぎます。" });

    await useDeviceStore.getState().updateControl("ac1", { temperature: 30 });

    const state = useDeviceStore.getState();
    // controls は元の 26℃ に戻る。
    expect(state.devices.find((d) => d.id === "ac1")?.controls.temperature).toBe(26);
    expect(state.error).toBe("リクエストが多すぎます。");
    // 永続層には何も書かれない。
    expect(prefs.get("airconStates")).toBeUndefined();
  });
});

/** Rust が返す赤外線ライト初期値（status なし・build_device デフォルト相当）。 */
const irLightDefault: Device = {
  id: "l1",
  name: "間接照明",
  model: "Light",
  category: "ir_light",
  supported: true,
  controls: { power: false },
};

describe("device-store ir_light", () => {
  beforeEach(() => {
    invoke.mockReset();
    prefs.clear();
    useDeviceStore.setState({ devices: [], loading: false, loaded: false, error: null });
  });

  it("refresh は永続化した最終電源値を赤外線ライトの controls に重畳する（V4）", async () => {
    const persisted: IrLightState = { power: true };
    prefs.set("irLightStates", { l1: persisted });
    // list_devices は初期値（power off）を返す（赤外線は status を持たないため）。
    invoke.mockResolvedValueOnce([irLightDefault]);

    await useDeviceStore.getState().refresh();

    const device = useDeviceStore.getState().devices.find((d) => d.id === "l1");
    expect(device?.controls.power).toBe(true);
  });

  it("電源操作（on）は send_ir_light を呼び楽観更新 + 永続化する（V4）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    invoke.mockResolvedValue(null);

    await useDeviceStore.getState().operateIrLight("l1", "on");

    expect(invoke).toHaveBeenCalledWith("send_ir_light", { id: "l1", action: "on" });
    // 「最後に送信した電源値」が永続化される。
    expect(prefs.get("irLightStates")).toEqual({ l1: { power: true } });
    // 楽観更新も反映されている。
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "l1")?.controls.power,
    ).toBe(true);
  });

  it("明暗操作（brighter）は送信のみで状態を持たず永続化しない（V4）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    invoke.mockResolvedValue(null);

    await useDeviceStore.getState().operateIrLight("l1", "brighter");

    expect(invoke).toHaveBeenCalledWith("send_ir_light", { id: "l1", action: "brighter" });
    // 明暗は絶対値・状態を持たないため永続化されず、power も変わらない。
    expect(prefs.get("irLightStates")).toBeUndefined();
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "l1")?.controls.power,
    ).toBe(false);
  });

  it("電源操作の送信失敗時は楽観更新をロールバックし永続化しない（V6）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    invoke.mockRejectedValue({ code: "rateLimited", message: "リクエストが多すぎます。" });

    await useDeviceStore.getState().operateIrLight("l1", "on");

    const state = useDeviceStore.getState();
    // power は元の off に戻る。
    expect(state.devices.find((d) => d.id === "l1")?.controls.power).toBe(false);
    expect(state.error).toBe("リクエストが多すぎます。");
    // 永続層には何も書かれない。
    expect(prefs.get("irLightStates")).toBeUndefined();
  });

  it("明暗操作の送信失敗時はエラーを保持しトースト通知する（V6）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    useNoticeStore.setState({ notices: [] });
    invoke.mockRejectedValue({ code: "rateLimited", message: "リクエストが多すぎます。" });

    await useDeviceStore.getState().operateIrLight("l1", "dimmer");

    expect(useDeviceStore.getState().error).toBe("リクエストが多すぎます。");
    // 全画面横断で気付けるようトースト通知も出す。
    expect(useNoticeStore.getState().notices.map((n) => n.message)).toContain(
      "リクエストが多すぎます。",
    );
  });
});
