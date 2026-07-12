import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { DEVICE_TTL_MS, useDeviceStore } from "./device-store";

/** ストアのシングルトンをテスト間で初期化する（TTL タイムスタンプの持ち越しを防ぐ）。 */
function resetStore(): void {
  useDeviceStore.setState({
    devices: [],
    loading: false,
    loaded: false,
    error: null,
    offlineIds: new Set(),
    lastFetchedAt: null,
  });
}

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
    resetStore();
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

  it("setClimate（エアコン）は全状態を setAll 送信し成功時に永続化する", async () => {
    useDeviceStore.setState({ devices: [airconDefault], loaded: true });
    invoke.mockResolvedValue(null);

    // モードだけ変更 → マージ後の全状態で send_aircon を呼ぶ。
    await useDeviceStore.getState().setClimate("ac1", { mode: "heat" });

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

    await useDeviceStore.getState().setClimate("ac1", { temperature: 30 });

    const state = useDeviceStore.getState();
    // controls は元の 26℃ に戻る。
    expect(state.devices.find((d) => d.id === "ac1")?.controls.temperature).toBe(26);
    // ストアは日本語でなく安定コードを保持する（表示端で翻訳）。
    expect(state.error).toBe("rateLimited");
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
    resetStore();
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

  it("setPower（on）は send_ir_light を呼び楽観更新 + 永続化する（V4）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    invoke.mockResolvedValue(null);

    await useDeviceStore.getState().setPower("l1", true);

    expect(invoke).toHaveBeenCalledWith("send_ir_light", { id: "l1", action: "on" });
    // 「最後に送信した電源値」が永続化される。
    expect(prefs.get("irLightStates")).toEqual({ l1: { power: true } });
    // 楽観更新も反映されている。
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "l1")?.controls.power,
    ).toBe(true);
  });

  it("nudgeBrightness（brighter）は送信のみで状態を持たず永続化しない（V4）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    invoke.mockResolvedValue(null);

    await useDeviceStore.getState().nudgeBrightness("l1", "brighter");

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

    await useDeviceStore.getState().setPower("l1", true);

    const state = useDeviceStore.getState();
    // power は元の off に戻る。
    expect(state.devices.find((d) => d.id === "l1")?.controls.power).toBe(false);
    expect(state.error).toBe("rateLimited");
    // 永続層には何も書かれない。
    expect(prefs.get("irLightStates")).toBeUndefined();
  });

  it("明暗操作の送信失敗時はエラーを保持しトースト通知する（V6）", async () => {
    useDeviceStore.setState({ devices: [irLightDefault], loaded: true });
    useNoticeStore.setState({ notices: [] });
    invoke.mockRejectedValue({ code: "rateLimited", message: "リクエストが多すぎます。" });

    await useDeviceStore.getState().nudgeBrightness("l1", "dimmer");

    expect(useDeviceStore.getState().error).toBe("rateLimited");
    // 全画面横断で気付けるようトースト通知も出す（コードで保持し表示端で翻訳）。
    expect(useNoticeStore.getState().notices.map((n) => n.code)).toContain(
      "rateLimited",
    );
  });
});

/** switchMode の Bot（deviceMode 由来。ON/OFF トグルで操作）。 */
const switchBot: Device = {
  id: "b-switch",
  name: "スイッチ Bot",
  model: "Bot",
  category: "bot",
  supported: true,
  controls: { power: false, botMode: "switch" },
};

/** pressMode の Bot（deviceMode 由来。「押す」momentary 操作）。 */
const pressBot: Device = {
  id: "b-press",
  name: "プッシュ Bot",
  model: "Bot",
  category: "bot",
  supported: true,
  controls: { power: false, botMode: "press" },
};

describe("device-store bot", () => {
  beforeEach(() => {
    invoke.mockReset();
    prefs.clear();
    resetStore();
  });

  it("switchMode の Bot は setPower で turnOn/turnOff を送り楽観更新する", async () => {
    useDeviceStore.setState({ devices: [switchBot], loaded: true });
    invoke.mockResolvedValue(null);

    await useDeviceStore.getState().setPower("b-switch", true);

    expect(invoke).toHaveBeenCalledWith("send_command", {
      id: "b-switch",
      command: "turnOn",
      parameter: "default",
      commandType: "command",
    });
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "b-switch")?.controls.power,
    ).toBe(true);
  });

  it("pressMode の Bot は press で send_command(press/default) を送り状態を変えない", async () => {
    useDeviceStore.setState({ devices: [pressBot], loaded: true });
    invoke.mockResolvedValue(null);

    await useDeviceStore.getState().press("b-press");

    expect(invoke).toHaveBeenCalledWith("send_command", {
      id: "b-press",
      command: "press",
      parameter: "default",
      commandType: "command",
    });
    // press は momentary 操作。楽観更新せず power は変わらない。
    expect(
      useDeviceStore.getState().devices.find((d) => d.id === "b-press")?.controls.power,
    ).toBe(false);
  });

  it("press の送信失敗時はエラーを保持しトースト通知する", async () => {
    useDeviceStore.setState({ devices: [pressBot], loaded: true });
    useNoticeStore.setState({ notices: [] });
    invoke.mockRejectedValue({ code: "rateLimited", message: "リクエストが多すぎます。" });

    await useDeviceStore.getState().press("b-press");

    expect(useDeviceStore.getState().error).toBe("rateLimited");
    expect(useNoticeStore.getState().notices.map((n) => n.code)).toContain(
      "rateLimited",
    );
  });
});

/** 電源トグルで操作する通常デバイス（オフライン検知テスト用）。 */
const plug: Device = {
  id: "p1",
  name: "サーキュレーター",
  model: "Plug Mini",
  category: "plug",
  supported: true,
  controls: { power: false },
};

const OFFLINE_MESSAGE = "デバイスがオフラインのため操作できません。";

describe("device-store offline（statusCode 161 検知）", () => {
  // 以降の error/notice はストアが保持する安定コードで検証する（表示端で翻訳）。
  beforeEach(() => {
    invoke.mockReset();
    prefs.clear();
    useNoticeStore.setState({ notices: [] });
    resetStore();
  });

  it("コマンドが offline で reject すると対象を offlineIds に入れロールバック + トーストする（V1）", async () => {
    useDeviceStore.setState({ devices: [plug], loaded: true });
    invoke.mockRejectedValue({ code: "offline", message: OFFLINE_MESSAGE });

    await useDeviceStore.getState().setPower("p1", true);

    const state = useDeviceStore.getState();
    // オフライン印が付く。
    expect(state.offlineIds.has("p1")).toBe(true);
    // 楽観更新はロールバックされ power は元の off。
    expect(state.devices.find((d) => d.id === "p1")?.controls.power).toBe(false);
    expect(state.error).toBe("offline");
    // 全画面横断で気付けるようトースト通知も出す（コードで保持）。
    expect(useNoticeStore.getState().notices.map((n) => n.code)).toContain("offline");
    // OFFLINE_MESSAGE は Rust の診断メッセージ（表示には使わない）。
    expect(OFFLINE_MESSAGE).toBe("デバイスがオフラインのため操作できません。");
  });

  it("apiStatus など offline 以外の失敗では offlineIds に入らず statusCode を保持する（V3）", async () => {
    useDeviceStore.setState({ devices: [plug], loaded: true });
    useNoticeStore.setState({ notices: [] });
    invoke.mockRejectedValue({
      code: "apiStatus",
      message: "SwitchBot API status code 190.",
      statusCode: 190,
    });

    await useDeviceStore.getState().setPower("p1", true);

    const state = useDeviceStore.getState();
    expect(state.offlineIds.has("p1")).toBe(false);
    expect(state.devices.find((d) => d.id === "p1")?.controls.power).toBe(false);
    expect(state.error).toBe("apiStatus");
    // apiStatus の番号は toast の補間用に notice へ引き継がれる（V6）。
    const notice = useNoticeStore.getState().notices.find((n) => n.code === "apiStatus");
    expect(notice?.statusCode).toBe(190);
  });

  it("refresh は offlineIds をクリアする（V4・方針 A）", async () => {
    useDeviceStore.setState({
      devices: [plug],
      loaded: true,
      offlineIds: new Set(["p1"]),
    });
    invoke.mockResolvedValueOnce([plug]);

    await useDeviceStore.getState().refresh();

    expect(useDeviceStore.getState().offlineIds.size).toBe(0);
  });
});

/** 調光ライト（brightness / color を持つ。commitControl 経路の検証用）。 */
const bulb: Device = {
  id: "bulb1",
  name: "カラー電球",
  model: "Color Bulb",
  category: "light",
  supported: true,
  controls: { power: true, brightness: 50 },
};

/** `list_devices` の invoke 回数（= SwitchBot API の 1+N 取得が走った回数）。 */
function listDeviceCalls(): number {
  return invoke.mock.calls.filter(([cmd]) => cmd === "list_devices").length;
}

describe("device-store TTL ガード（V4）", () => {
  beforeEach(() => {
    invoke.mockReset();
    prefs.clear();
    useNoticeStore.setState({ notices: [] });
    resetStore();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-12T10:00:00Z"));
    invoke.mockImplementation(async (cmd: string) =>
      cmd === "list_devices" ? [plug, bulb, airconDefault, irLightDefault] : null,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshIfStale は未取得（lastFetchedAt=null）なら取得する", async () => {
    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(1);
    expect(useDeviceStore.getState().lastFetchedAt).toBe(Date.now());
  });

  it("TTL 内の refreshIfStale は取得せず、devices もそのまま保持する（V5）", async () => {
    await useDeviceStore.getState().refreshIfStale();
    const before = useDeviceStore.getState().devices;

    vi.advanceTimersByTime(DEVICE_TTL_MS - 1_000);
    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(1);
    // スキップ時に devices が作り直されない（楽観更新済みの表示が巻き戻らない）。
    expect(useDeviceStore.getState().devices).toBe(before);
  });

  it("TTL 経過後の refreshIfStale は取得する", async () => {
    await useDeviceStore.getState().refreshIfStale();

    vi.advanceTimersByTime(DEVICE_TTL_MS + 1_000);
    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(2);
  });

  it("refresh は TTL 内でも必ず取得する（手動更新 / 再試行が force で貫通する・V3）", async () => {
    await useDeviceStore.getState().refreshIfStale();

    vi.advanceTimersByTime(1_000);
    await useDeviceStore.getState().refresh();

    expect(listDeviceCalls()).toBe(2);
  });

  it("取得に失敗したら lastFetchedAt を更新せず、直後の refreshIfStale が再試行する", async () => {
    invoke.mockRejectedValueOnce({ code: "network", message: "接続できません。" });

    await useDeviceStore.getState().refreshIfStale();
    expect(useDeviceStore.getState().lastFetchedAt).toBeNull();

    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(2);
    expect(useDeviceStore.getState().error).toBeNull();
  });

  it("取得中（loading）の refreshIfStale は二重に取得しない", async () => {
    useDeviceStore.setState({ loading: true });

    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(0);
  });

  it("status を持つデバイスへのコマンド成功はキャッシュを無効化し、TTL 内でも次の refreshIfStale が取得する", async () => {
    await useDeviceStore.getState().refreshIfStale();

    await useDeviceStore.getState().setPower("p1", true);
    expect(useDeviceStore.getState().lastFetchedAt).toBeNull();

    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(2);
  });

  it("commitControl 経路（明るさ）のコマンド成功もキャッシュを無効化する", async () => {
    await useDeviceStore.getState().refreshIfStale();

    await useDeviceStore.getState().setBrightness("bulb1", 80);

    expect(useDeviceStore.getState().lastFetchedAt).toBeNull();
  });

  it("コマンドが失敗したらキャッシュを無効化しない（サーバ状態は変わっていない）", async () => {
    await useDeviceStore.getState().refreshIfStale();
    const fetchedAt = useDeviceStore.getState().lastFetchedAt;
    invoke.mockRejectedValueOnce({ code: "offline", message: OFFLINE_MESSAGE });

    await useDeviceStore.getState().setPower("p1", true);

    expect(useDeviceStore.getState().lastFetchedAt).toBe(fetchedAt);
  });

  it("赤外線デバイス（エアコン / 赤外線ライト）へのコマンドはキャッシュを無効化しない", async () => {
    // 赤外線は status を持たないため、refresh しても新情報がゼロ（無駄な 1+N を誘発しない）。
    await useDeviceStore.getState().refreshIfStale();
    const fetchedAt = useDeviceStore.getState().lastFetchedAt;

    await useDeviceStore.getState().setClimate("ac1", { mode: "heat" });
    await useDeviceStore.getState().setPower("l1", true);
    await useDeviceStore.getState().nudgeBrightness("l1", "brighter");

    expect(useDeviceStore.getState().lastFetchedAt).toBe(fetchedAt);

    vi.advanceTimersByTime(1_000);
    await useDeviceStore.getState().refreshIfStale();

    expect(listDeviceCalls()).toBe(1);
  });
});
