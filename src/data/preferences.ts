/**
 * クライアント側で永続化する設定（お気に入り / 初回案内フラグ）の単一境界。
 *
 * 永続化には `@tauri-apps/plugin-store` を使い、同一 `STORE_PATH` の `load` は
 * 同じ Store インスタンスを再利用する。メイン / トレイ両ウィンドウが同じファイルを
 * 読むため、お気に入りの schema は両者で一貫する（V5）。
 *
 * plugin-store 呼び出しはこのモジュールに集約し、他所からは直接触らない（境界の単一化）。
 */
import { load, type Store } from "@tauri-apps/plugin-store";

import type { AirconState, IrLightState } from "./types";

const STORE_PATH = "preferences.json";
const KEY_FAVORITE_DEVICES = "favoriteDevices";
const KEY_FAVORITE_SCENES = "favoriteScenes";
const KEY_CLOSE_TO_TRAY_NOTICE_SEEN = "closeToTrayNoticeSeen";
const KEY_SENSOR_ORDER = "sensorOrder";
const KEY_AIRCON_STATES = "airconStates";
const KEY_IR_LIGHT_STATES = "irLightStates";

/** お気に入り（デバイス / シーンの id 集合）の永続 schema。 */
export type FavoritesSnapshot = {
  deviceIds: string[];
  sceneIds: string[];
};

let storePromise: Promise<Store> | null = null;

/** Store を遅延生成し以後は再利用する（autoSave で debounce 保存）。 */
function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_PATH, { defaults: {}, autoSave: true });
  }
  return storePromise;
}

export async function loadFavorites(): Promise<FavoritesSnapshot> {
  const store = await getStore();
  const deviceIds = (await store.get<string[]>(KEY_FAVORITE_DEVICES)) ?? [];
  const sceneIds = (await store.get<string[]>(KEY_FAVORITE_SCENES)) ?? [];
  return { deviceIds, sceneIds };
}

export async function saveFavorites(snapshot: FavoritesSnapshot): Promise<void> {
  const store = await getStore();
  await store.set(KEY_FAVORITE_DEVICES, snapshot.deviceIds);
  await store.set(KEY_FAVORITE_SCENES, snapshot.sceneIds);
  await store.save();
}

/** センサーセクションの並べ替え順（センサー id の配列）。未設定なら空配列。 */
export async function loadSensorOrder(): Promise<string[]> {
  const store = await getStore();
  return (await store.get<string[]>(KEY_SENSOR_ORDER)) ?? [];
}

/** センサーセクションの並べ替え順を保存する。 */
export async function saveSensorOrder(order: string[]): Promise<void> {
  const store = await getStore();
  await store.set(KEY_SENSOR_ORDER, order);
  await store.save();
}

/**
 * 赤外線エアコンの「最後に送信した値」（deviceId → 状態）。赤外線は status を返さない
 * ため、これが表示の唯一のソースになる（V4）。未設定なら空マップ。
 */
export async function loadAirconStates(): Promise<Record<string, AirconState>> {
  const store = await getStore();
  return (await store.get<Record<string, AirconState>>(KEY_AIRCON_STATES)) ?? {};
}

/** 1 台分のエアコン状態を保存する（他デバイスの値はマージして保持する）。 */
export async function saveAirconState(id: string, state: AirconState): Promise<void> {
  const store = await getStore();
  const current = (await store.get<Record<string, AirconState>>(KEY_AIRCON_STATES)) ?? {};
  await store.set(KEY_AIRCON_STATES, { ...current, [id]: state });
  await store.save();
}

/**
 * 赤外線ライトの「最後に送信した電源値」（deviceId → 状態）。赤外線は status を返さない
 * ため、これが電源表示の唯一のソースになる（V4）。明暗の増減は状態を持たず永続化しない。
 * 未設定なら空マップ。
 */
export async function loadIrLightStates(): Promise<Record<string, IrLightState>> {
  const store = await getStore();
  return (await store.get<Record<string, IrLightState>>(KEY_IR_LIGHT_STATES)) ?? {};
}

/** 1 台分の赤外線ライト電源状態を保存する（他デバイスの値はマージして保持する）。 */
export async function saveIrLightState(id: string, state: IrLightState): Promise<void> {
  const store = await getStore();
  const current = (await store.get<Record<string, IrLightState>>(KEY_IR_LIGHT_STATES)) ?? {};
  await store.set(KEY_IR_LIGHT_STATES, { ...current, [id]: state });
  await store.save();
}

/** close-to-tray の初回案内を既に表示済みか。 */
export async function loadCloseToTrayNoticeSeen(): Promise<boolean> {
  const store = await getStore();
  return (await store.get<boolean>(KEY_CLOSE_TO_TRAY_NOTICE_SEEN)) ?? false;
}

/** close-to-tray の初回案内を表示済みとして記録する。 */
export async function saveCloseToTrayNoticeSeen(): Promise<void> {
  const store = await getStore();
  await store.set(KEY_CLOSE_TO_TRAY_NOTICE_SEEN, true);
  await store.save();
}
