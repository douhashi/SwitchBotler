import { create } from "zustand";

import { dataSource, type Device, type DeviceControls } from "@/data";

type DeviceState = {
  devices: Device[];
  loading: boolean;
  loaded: boolean;
  /** 初回のみ取得する（既に読み込み済みなら何もしない）。 */
  load: () => Promise<void>;
  /** 明示的に再取得する。 */
  refresh: () => Promise<void>;
  /** 電源をトグルし、返ってきた状態でストアを更新する。 */
  toggle: (id: string) => Promise<void>;
  /** 制御値を部分更新し、返ってきた状態でストアを更新する。 */
  updateControl: (id: string, patch: Partial<DeviceControls>) => Promise<void>;
};

/** 返ってきた 1 台で devices 配列の該当要素を差し替える。 */
function replaceDevice(devices: Device[], next: Device): Device[] {
  return devices.map((d) => (d.id === next.id ? next : d));
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  loading: false,
  loaded: false,
  load: async () => {
    if (get().loaded || get().loading) return;
    await get().refresh();
  },
  refresh: async () => {
    set({ loading: true });
    try {
      const devices = await dataSource.getDevices();
      set({ devices, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  toggle: async (id) => {
    const device = get().devices.find((d) => d.id === id);
    if (!device) return;
    const next = await dataSource.toggleDevice(id, !device.controls.power);
    set((s) => ({ devices: replaceDevice(s.devices, next) }));
  },
  updateControl: async (id, patch) => {
    const next = await dataSource.updateDeviceControl(id, patch);
    set((s) => ({ devices: replaceDevice(s.devices, next) }));
  },
}));
