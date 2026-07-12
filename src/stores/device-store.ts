import { create } from "zustand";

import {
  type AirconState,
  dataSource,
  type Device,
  type DeviceControls,
  hasPowerToggle,
  type IrLightState,
} from "@/data";
import { isOfflineError } from "@/data/ipc";
import {
  loadAirconStates,
  loadIrLightStates,
  saveAirconState,
  saveIrLightState,
} from "@/data/preferences";
import { type AppErrorCode, errorCodeOf, statusCodeOf } from "@/i18n/error";
import { notify } from "@/stores/notice-store";

/**
 * デバイス一覧の鮮度 TTL（ms）。**自動リフレッシュ経路（`refreshIfStale`）のみ**に適用する。
 *
 * 一覧取得は 1 + N リクエスト（GET /devices + 非赤外線デバイスごとの status）を消費するため、
 * トレイ popup の連続開閉のようなバーストでレート（1 日 10,000）を浪費しないよう間引く。
 * TTL が規定するのは「自アプリ以外の経路（物理スイッチ・SwitchBot アプリ）で変えられた
 * 状態への追随遅延の上限」だけである（自アプリの操作は楽観更新 + 無効化で常に整合する）。
 */
export const DEVICE_TTL_MS = 30_000;

type DeviceState = {
  devices: Device[];
  loading: boolean;
  loaded: boolean;
  /** 直近の取得/操作で発生したエラーコード（表示端で `errors` namespace により翻訳する）。 */
  error: AppErrorCode | null;
  /**
   * オフライン（コマンドが statusCode 161 を返した）と検知したデバイス id の集合。
   * `devices`/`loading`/`error` と同じ横断的な一時状態で、`Device` 型自体には
   * 永続属性を付与しない。`refresh` でクリアする（方針 A・リアクティブ検知）。
   */
  offlineIds: Set<string>;
  /**
   * 最後に**取得へ成功した**時刻（epoch ms）。未取得、または制御コマンド成功でキャッシュを
   * 無効化した場合は `null`（= 次の `refreshIfStale` が必ず取得する）。
   */
  lastFetchedAt: number | null;
  /** 初回のみ取得する（既に読み込み済みなら何もしない）。 */
  load: () => Promise<void>;
  /** 明示的に再取得する（TTL を無視して**常に**取得する。手動更新ボタン / エラー再試行）。 */
  refresh: () => Promise<void>;
  /**
   * 鮮度が古い場合のみ再取得する（自動リフレッシュ経路。トレイ popup の focus 取得 /
   * メインウィンドウの `main-shown`）。{@link DEVICE_TTL_MS} 以内、または取得進行中なら
   * 何もしない。
   */
  refreshIfStale: () => Promise<void>;
  /**
   * 電源を設定する（capability: power）。送信方法（汎用 setPower / エアコン setAll /
   * 赤外線 on-off）は category ごとに内部で振り分け、呼び出し側は on/off だけを渡す。
   * 楽観更新・失敗時ロールバック。エアコン/赤外線は「最後に送信した値」を永続化する。
   */
  setPower: (id: string, on: boolean) => Promise<void>;
  /** 明るさを設定する（capability: brightness。調光ライト）。楽観更新・失敗時ロールバック。 */
  setBrightness: (id: string, value: number) => Promise<void>;
  /** カラーを設定する（capability: color。カラー電球）。楽観更新・失敗時ロールバック。 */
  setColor: (id: string, colorId: string) => Promise<void>;
  /** 開度を設定する（capability: position。カーテン）。楽観更新・失敗時ロールバック。 */
  setPosition: (id: string, value: number) => Promise<void>;
  /**
   * エアコンの運転状態を部分更新する（capability: climate。温度/モード/風量）。
   * 常に全状態を setAll 送信し、成功時に「最後に送信した値」を永続化する。
   */
  setClimate: (id: string, patch: Partial<DeviceControls>) => Promise<void>;
  /**
   * 赤外線ライトの相対明暗（capability: brightnessRelative）。絶対値・状態を持たない
   * 送信専用アクションのため楽観更新も永続化もせず、失敗時のみ error + トースト。
   */
  nudgeBrightness: (id: string, direction: "brighter" | "dimmer") => Promise<void>;
  /**
   * Bot を 1 回押す（pressMode）。press は状態を持たない momentary 操作のため、
   * 楽観更新はせず送信のみ行い、失敗時のみ error セット + トースト通知する
   * （相対明暗と同型）。
   */
  press: (id: string) => Promise<void>;
};

/** 該当デバイスの controls を差し替えた配列を返す。 */
function withControls(devices: Device[], id: string, controls: DeviceControls): Device[] {
  return devices.map((d) => (d.id === id ? { ...d, controls } : d));
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
    const code = errorCodeOf(error);
    const statusCode = statusCodeOf(error);
    set((s) => {
      const devices = previous ? withControls(s.devices, id, previous) : s.devices;
      const offlineIds = isOfflineError(error)
        ? new Set(s.offlineIds).add(id)
        : s.offlineIds;
      return { devices, error: code, offlineIds };
    });
    notify(code, statusCode);
  };

  /** 楽観更新（先に反映し、失敗時に failOperation でロールバック）。 */
  const optimistic = (id: string, next: DeviceControls): void => {
    set((s) => ({ devices: withControls(s.devices, id, next), error: null }));
  };

  /**
   * キャッシュを無効化する（サーバ実状態が変わったので鮮度をリセットする）。
   * 即時 refresh はせず（追加リクエスト 0・楽観更新値を古い status で上書きしない）、
   * **次の自動リフレッシュが TTL に阻まれず最新化する**ようにするだけ。
   * status を持つデバイスへのコマンド成功時にのみ呼ぶ（赤外線は status が無く情報利得ゼロ）。
   */
  const invalidate = (): void => {
    set({ lastFetchedAt: null });
  };

  /**
   * エアコン送信（capability: power/climate 共通）。温度・モード・風量・電源を常に一括
   * 送信（setAll）し、成功時に「最後に送信した値」を永続化する（V4）。失敗はロールバック。
   */
  const commitAircon = async (
    id: string,
    previous: DeviceControls,
    next: DeviceControls,
  ): Promise<void> => {
    optimistic(id, next);
    const state = airconStateOf(next);
    try {
      await dataSource.setAircon(id, state);
      await saveAirconState(id, state);
    } catch (error) {
      failOperation(id, previous, error);
    }
  };

  /** 赤外線ライトの電源送信。on/off を送信し電源値を永続化する（赤外線は status を持たない）。 */
  const commitIrPower = async (
    id: string,
    previous: DeviceControls,
    on: boolean,
  ): Promise<void> => {
    optimistic(id, { ...previous, power: on });
    try {
      await dataSource.sendIrLight(id, on ? "on" : "off");
      await saveIrLightState(id, { power: on });
    } catch (error) {
      failOperation(id, previous, error);
    }
  };

  /**
   * 汎用の制御値部分更新（brightness / color / position）。対象はいずれも status を持つ
   * デバイスのため、成功時にキャッシュを無効化する。
   */
  const commitControl = async (
    id: string,
    previous: DeviceControls,
    patch: Partial<DeviceControls>,
  ): Promise<void> => {
    optimistic(id, { ...previous, ...patch });
    try {
      await dataSource.updateControl(id, patch);
      invalidate();
    } catch (error) {
      failOperation(id, previous, error);
    }
  };

  return {
    devices: [],
    loading: false,
    loaded: false,
    error: null,
    offlineIds: new Set<string>(),
    lastFetchedAt: null,
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
        // 鮮度は成功時のみ更新する（失敗をキャッシュしてエラー状態に閉じ込めない）。
        set({
          devices: overlaid,
          loaded: true,
          offlineIds: new Set<string>(),
          lastFetchedAt: Date.now(),
        });
      } catch (error) {
        set({ error: errorCodeOf(error), loaded: true });
      } finally {
        set({ loading: false });
      }
    },
    refreshIfStale: async () => {
      const { loading, lastFetchedAt } = get();
      if (loading) return; // 取得進行中（in-flight）の二重発火を抑止する。
      if (lastFetchedAt !== null && Date.now() - lastFetchedAt < DEVICE_TTL_MS) return;
      await get().refresh();
    },
    setPower: async (id, on) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      const previous = device.controls;
      // 送信差は category ごとに吸収する（UI からは on/off を渡すだけ）。
      if (device.category === "aircon") {
        await commitAircon(id, previous, { ...previous, power: on });
        return;
      }
      if (device.category === "ir_light") {
        await commitIrPower(id, previous, on);
        return;
      }
      if (!hasPowerToggle(device)) return;
      optimistic(id, { ...previous, power: on });
      try {
        await dataSource.setPower(id, device.category, on);
        invalidate();
      } catch (error) {
        failOperation(id, previous, error);
      }
    },
    setBrightness: async (id, value) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      await commitControl(id, device.controls, { brightness: value });
    },
    setColor: async (id, colorId) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      await commitControl(id, device.controls, { colorId });
    },
    setPosition: async (id, value) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      await commitControl(id, device.controls, { position: value });
    },
    setClimate: async (id, patch) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      await commitAircon(id, device.controls, { ...device.controls, ...patch });
    },
    nudgeBrightness: async (id, direction) => {
      const device = get().devices.find((d) => d.id === id);
      if (!device) return;
      // 相対明暗は絶対値・状態を持たないため送信のみ（楽観更新・永続化しない）。
      set({ error: null });
      try {
        await dataSource.sendIrLight(id, direction);
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
