import { create } from "zustand";

import {
  type AirconState,
  dataSource,
  type Device,
  type DeviceControls,
  hasPowerToggle,
  type IrLightAction,
  type IrLightState,
} from "@/data";
import { isOfflineError } from "@/data/ipc";
import {
  loadAirconStates,
  loadIrLightStates,
  saveAirconState,
  saveIrLightState,
} from "@/data/preferences";
import { notify } from "@/stores/notice-store";

type DeviceState = {
  devices: Device[];
  loading: boolean;
  loaded: boolean;
  /** 直近の取得/操作で発生したエラーメッセージ（日本語・秘匿値なし）。 */
  error: string | null;
  /**
   * オフライン（コマンドが statusCode 161 を返した）と検知したデバイス id の集合。
   * `devices`/`loading`/`error` と同じ横断的な一時状態で、`Device` 型自体には
   * 永続属性を付与しない。`refresh` でクリアする（方針 A・リアクティブ検知）。
   */
  offlineIds: Set<string>;
  /** 初回のみ取得する（既に読み込み済みなら何もしない）。 */
  load: () => Promise<void>;
  /** 明示的に再取得する。 */
  refresh: () => Promise<void>;
  /** 電源をトグルする（楽観更新・失敗時ロールバック）。 */
  toggle: (id: string) => Promise<void>;
  /** 制御値を部分更新する（楽観更新・失敗時ロールバック）。 */
  updateControl: (id: string, patch: Partial<DeviceControls>) => Promise<void>;
  /**
   * 赤外線ライトを操作する。電源（on/off）は楽観更新 + 永続化 + 失敗時ロールバック、
   * 明暗（brighter/dimmer）は状態を持たず送信のみ（失敗時トースト）。
   */
  operateIrLight: (id: string, action: IrLightAction) => Promise<void>;
  /**
   * Bot を 1 回押す（pressMode）。press は状態を持たない momentary 操作のため、
   * 楽観更新はせず送信のみ行い、失敗時のみ error セット + トースト通知する
   * （ir_light の brighter/dimmer と同型）。
   */
  press: (id: string) => Promise<void>;
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

/**
 * 永続化した「最後に送信した電源値」を、対応する赤外線ライトの controls に重畳する。
 * 赤外線は status が無く build_device の初期値（power off）しか持たないため、これが電源表示の
 * 唯一のソース（V4）。明暗は状態を持たないため重畳対象は power のみ。
 */
function overlayIrLightStates(
  devices: Device[],
  persisted: Record<string, IrLightState>,
): Device[] {
  return devices.map((d) => {
    const state = d.category === "ir_light" ? persisted[d.id] : undefined;
    if (!state) return d;
    return { ...d, controls: { ...d.controls, power: state.power } };
  });
}

export const useDeviceStore = create<DeviceState>((set, get) => {
  /**
   * 操作失敗時の共通後処理（DRY）。
   * 1. `previous` が渡されたら楽観更新をロールバックする
   * 2. エラーメッセージを保持する
   * 3. オフライン（statusCode 161）由来なら `offlineIds` に id を加え、UI で操作抑止する
   * 4. 全画面横断で気付けるようトーストでも通知する
   */
  const failOperation = (
    id: string,
    previous: DeviceControls | undefined,
    error: unknown,
  ): void => {
    const message = messageOf(error);
    set((s) => {
      const devices = previous ? withControls(s.devices, id, previous) : s.devices;
      const offlineIds = isOfflineError(error)
        ? new Set(s.offlineIds).add(id)
        : s.offlineIds;
      return { devices, error: message, offlineIds };
    });
    notify(message);
  };

  return {
    devices: [],
    loading: false,
    loaded: false,
    error: null,
    offlineIds: new Set<string>(),
    load: async () => {
      if (get().loaded || get().loading) return;
      await get().refresh();
    },
    refresh: async () => {
      // 再取得のたびにオフライン印はクリアする（方針 A・リアクティブ検知）。
      set({ loading: true, error: null, offlineIds: new Set<string>() });
      try {
        const [devices, airconStates, irLightStates] = await Promise.all([
          dataSource.getDevices(),
          loadAirconStates(),
          loadIrLightStates(),
        ]);
        // 赤外線デバイスは status を持たないため、永続化した最終送信値を重畳する（V4）。
        const overlaid = overlayIrLightStates(
          overlayAirconStates(devices, airconStates),
          irLightStates,
        );
        set({ devices: overlaid, loaded: true, offlineIds: new Set<string>() });
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
        failOperation(id, previous, error);
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
          failOperation(id, previous, error);
        }
        return;
      }

      try {
        await dataSource.updateControl(id, patch);
      } catch (error) {
        failOperation(id, previous, error);
      }
    },
    operateIrLight: async (id, action) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;

      // 電源（on/off）は「最後に送信した値」を持つため楽観更新 + 永続化する。
      if (action === "on" || action === "off") {
        const previous = device.controls;
        const next = { ...previous, power: action === "on" };
        set((s) => ({ devices: withControls(s.devices, id, next), error: null }));
        try {
          await dataSource.sendIrLight(id, action);
          await saveIrLightState(id, { power: next.power });
        } catch (error) {
          failOperation(id, previous, error);
        }
        return;
      }

      // 明暗（brighter/dimmer）は絶対値・状態を持たないため送信のみ（永続化しない）。
      set({ error: null });
      try {
        await dataSource.sendIrLight(id, action);
      } catch (error) {
        failOperation(id, undefined, error);
      }
    },
    press: async (id) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      // press は状態を持たない momentary 操作。楽観更新なし、送信のみ（失敗時トースト）。
      set({ error: null });
      try {
        await dataSource.pressBot(id);
      } catch (error) {
        failOperation(id, undefined, error);
      }
    },
  };
});
