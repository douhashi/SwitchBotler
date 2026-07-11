import { create } from "zustand";

import {
  type AirconState,
  dataSource,
  type Device,
  type DeviceControls,
  hasPowerToggle,
} from "@/data";
import { loadAirconStates, saveAirconState } from "@/data/preferences";
import { notify } from "@/stores/notice-store";

type DeviceState = {
  devices: Device[];
  loading: boolean;
  loaded: boolean;
  /** 直近の取得/操作で発生したエラーメッセージ（日本語・秘匿値なし）。 */
  error: string | null;
  /** 初回のみ取得する（既に読み込み済みなら何もしない）。 */
  load: () => Promise<void>;
  /** 明示的に再取得する。 */
  refresh: () => Promise<void>;
  /** 電源をトグルする（楽観更新・失敗時ロールバック）。 */
  toggle: (id: string) => Promise<void>;
  /** 制御値を部分更新する（楽観更新・失敗時ロールバック）。 */
  updateControl: (id: string, patch: Partial<DeviceControls>) => Promise<void>;
};

/** 該当デバイスの controls を差し替えた配列を返す。 */
function withControls(devices: Device[], id: string, controls: DeviceControls): Device[] {
  return devices.map((d) => (d.id === id ? { ...d, controls } : d));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "操作に失敗しました。";
}

/**
 * controls からエアコンの送信状態を導出する（欠損はデフォルトで補完）。
 * 赤外線は status を持たないため build_device 側で常に全項目が入るが、型上は任意なので防御的に補う。
 */
function airconStateOf(controls: DeviceControls): AirconState {
  return {
    power: controls.power,
    temperature: controls.temperature ?? 26,
    mode: controls.mode ?? "cool",
    fanSpeed: controls.fanSpeed ?? "auto",
  };
}

/**
 * 永続化した「最後に送信した値」を、対応するエアコンの controls に重畳する。
 * 赤外線は status が無く build_device の初期値しか持たないため、これが表示の唯一のソース（V4）。
 */
function overlayAirconStates(
  devices: Device[],
  persisted: Record<string, AirconState>,
): Device[] {
  return devices.map((d) => {
    const state = d.category === "aircon" ? persisted[d.id] : undefined;
    if (!state) return d;
    return {
      ...d,
      controls: {
        ...d.controls,
        power: state.power,
        temperature: state.temperature,
        mode: state.mode,
        fanSpeed: state.fanSpeed,
      },
    };
  });
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  loading: false,
  loaded: false,
  error: null,
  load: async () => {
    if (get().loaded || get().loading) return;
    await get().refresh();
  },
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [devices, persisted] = await Promise.all([
        dataSource.getDevices(),
        loadAirconStates(),
      ]);
      // 赤外線エアコンは status を持たないため、永続化した最終送信値を重畳する（V4）。
      set({ devices: overlayAirconStates(devices, persisted), loaded: true });
    } catch (error) {
      set({ error: messageOf(error), loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  toggle: async (id) => {
    const device = get().devices.find((d) => d.id === id);
    if (!device || !hasPowerToggle(device)) return;
    const previous = device.controls;
    const next = { ...previous, power: !previous.power };
    // 楽観更新: 先に反映し、失敗したら戻す（クラウド status の反映遅延を回避）。
    set((s) => ({ devices: withControls(s.devices, id, next), error: null }));
    try {
      await dataSource.setPower(id, device.category, next.power);
    } catch (error) {
      const message = messageOf(error);
      // 楽観更新をロールバックし、全画面横断で気付けるようトーストでも通知する。
      set((s) => ({ devices: withControls(s.devices, id, previous), error: message }));
      notify(message);
    }
  },
  updateControl: async (id, patch) => {
    const device = get().devices.find((d) => d.id === id);
    if (!device) return;
    const previous = device.controls;
    const next = { ...previous, ...patch };
    // 楽観更新（全カテゴリ共通）。
    set((s) => ({ devices: withControls(s.devices, id, next), error: null }));

    if (device.category === "aircon") {
      // 赤外線エアコンは温度・モード・風量・電源を常に一括送信（setAll）する。
      // 成功したら「最後に送信した値」を永続化する（V4）。失敗はロールバック + トースト。
      const state = airconStateOf(next);
      try {
        await dataSource.setAircon(id, state);
        await saveAirconState(id, state);
      } catch (error) {
        const message = messageOf(error);
        set((s) => ({ devices: withControls(s.devices, id, previous), error: message }));
        notify(message);
      }
      return;
    }

    try {
      await dataSource.updateControl(id, patch);
    } catch (error) {
      const message = messageOf(error);
      set((s) => ({ devices: withControls(s.devices, id, previous), error: message }));
      notify(message);
    }
  },
}));
