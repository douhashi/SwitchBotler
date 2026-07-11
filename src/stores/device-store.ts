import { create } from "zustand";

import {
  dataSource,
  type Device,
  type DeviceControls,
  hasPowerToggle,
} from "@/data";

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
      const devices = await dataSource.getDevices();
      set({ devices, loaded: true });
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
      set((s) => ({ devices: withControls(s.devices, id, previous), error: messageOf(error) }));
    }
  },
  updateControl: async (id, patch) => {
    const device = get().devices.find((d) => d.id === id);
    if (!device) return;
    const previous = device.controls;
    const next = { ...previous, ...patch };
    set((s) => ({ devices: withControls(s.devices, id, next), error: null }));
    try {
      await dataSource.updateControl(id, patch);
    } catch (error) {
      set((s) => ({ devices: withControls(s.devices, id, previous), error: messageOf(error) }));
    }
  },
}));
