import { create } from "zustand";

import { loadFavorites, saveFavorites } from "@/data/preferences";

/**
 * お気に入り（デバイス / シーンの id）ストア。
 *
 * **順序が第一級**。配列の並びがそのまま表示順になり、一覧とトレイポップアップの
 * 両方がこの順で描画する。永続化は `data/preferences.ts`（plugin-store 境界）に
 * 委譲する（`string[]` で順序を保持）。変更は即時反映し、その後バックグラウンドで
 * 保存する（保存失敗でも UI は進む）。
 *
 * 操作モデル: お気に入りは**セクション（ドロップ先）**であり、デバイスは**ドラッグで移す**。
 * 「登録」と「並び替え」は同じ操作（落とした位置＝並び順）なので、両方を {@link place} が担う。
 * ピンのようなボタンは持たない（非ドラッグ経路はコンテキストメニューが担当）。
 */
export type ReorderDirection = "up" | "down";

type FavoritesState = {
  /** お気に入りデバイスの id（この並びが表示順）。 */
  deviceIds: string[];
  /** お気に入りシーンの id（この並びが表示順）。 */
  sceneIds: string[];
  loaded: boolean;
  /** 初回のみ永続値を読み込む。 */
  load: () => Promise<void>;
  /** 明示的に再読込する（別ウィンドウでの変更を取り込む）。 */
  reload: () => Promise<void>;
  /**
   * `index` の位置へ置く。**未登録なら登録、登録済みなら移動**（＝ドロップ位置が並び順）。
   * `index` は「その id を除いた並び」における挿入位置。
   */
  placeDeviceFavorite: (id: string, index: number) => Promise<void>;
  placeSceneFavorite: (id: string, index: number) => Promise<void>;
  /** お気に入りから外す（セクションの外へドロップ / コンテキストメニュー）。 */
  removeDeviceFavorite: (id: string) => Promise<void>;
  removeSceneFavorite: (id: string) => Promise<void>;
  /** 登録 / 解除のトグル（コンテキストメニュー用。登録は末尾）。 */
  toggleDeviceFavorite: (id: string) => Promise<void>;
  toggleSceneFavorite: (id: string) => Promise<void>;
  /** 1 つ上 / 下へ移動（ドラッグのキーボード代替）。端では変化しない。 */
  moveDeviceFavorite: (id: string, direction: ReorderDirection) => Promise<void>;
  moveSceneFavorite: (id: string, direction: ReorderDirection) => Promise<void>;
  isDeviceFavorite: (id: string) => boolean;
  isSceneFavorite: (id: string) => boolean;
};

/**
 * `id` を `index` に置いた新しい配列を返す。
 * 一旦取り除いてから挿し込むので、**未登録なら追加・登録済みなら移動**の両方を兼ねる。
 */
function placed(ids: string[], id: string, index: number): string[] {
  const without = ids.filter((x) => x !== id);
  const at = Math.max(0, Math.min(index, without.length));
  return [...without.slice(0, at), id, ...without.slice(at)];
}

/** 登録 / 解除した新しい配列を返す。登録は末尾に足す。 */
function toggled(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** 隣と入れ替えた新しい配列を返す。端（先頭で up / 末尾で down）なら変化させない。 */
function moved(ids: string[], id: string, direction: ReorderDirection): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  next[from] = ids[to];
  next[to] = ids[from];
  return next;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => {
  const persist = () =>
    saveFavorites({
      deviceIds: get().deviceIds,
      sceneIds: get().sceneIds,
    }).catch(() => {
      // 保存失敗は致命ではない（次回操作で再保存される）。UI は既に反映済み。
    });

  return {
    deviceIds: [],
    sceneIds: [],
    loaded: false,
    load: async () => {
      if (get().loaded) return;
      await get().reload();
    },
    reload: async () => {
      try {
        const { deviceIds, sceneIds } = await loadFavorites();
        set({ deviceIds, sceneIds, loaded: true });
      } catch {
        // 読込失敗時は空のまま進む。
        set({ loaded: true });
      }
    },
    placeDeviceFavorite: async (id, index) => {
      set((s) => ({ deviceIds: placed(s.deviceIds, id, index) }));
      await persist();
    },
    placeSceneFavorite: async (id, index) => {
      set((s) => ({ sceneIds: placed(s.sceneIds, id, index) }));
      await persist();
    },
    removeDeviceFavorite: async (id) => {
      set((s) => ({ deviceIds: s.deviceIds.filter((x) => x !== id) }));
      await persist();
    },
    removeSceneFavorite: async (id) => {
      set((s) => ({ sceneIds: s.sceneIds.filter((x) => x !== id) }));
      await persist();
    },
    toggleDeviceFavorite: async (id) => {
      set((s) => ({ deviceIds: toggled(s.deviceIds, id) }));
      await persist();
    },
    toggleSceneFavorite: async (id) => {
      set((s) => ({ sceneIds: toggled(s.sceneIds, id) }));
      await persist();
    },
    moveDeviceFavorite: async (id, direction) => {
      set((s) => ({ deviceIds: moved(s.deviceIds, id, direction) }));
      await persist();
    },
    moveSceneFavorite: async (id, direction) => {
      set((s) => ({ sceneIds: moved(s.sceneIds, id, direction) }));
      await persist();
    },
    isDeviceFavorite: (id) => get().deviceIds.includes(id),
    isSceneFavorite: (id) => get().sceneIds.includes(id),
  };
});
