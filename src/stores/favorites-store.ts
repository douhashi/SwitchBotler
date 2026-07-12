import { create } from "zustand";

import { loadFavorites, saveFavorites } from "@/data/preferences";

/**
 * お気に入り（デバイス / シーンの id）ストア。
 *
 * 対象は **デバイスとシーン（id ベース）**（PO 決定2: アクション単位は不採用）。
 *
 * **順序が第一級**。配列の並びがそのまま表示順になり、一覧とトレイポップアップの
 * 両方がこの順で描画する（よく使う順に並べ替えられる）。
 * 永続化は `data/preferences.ts`（plugin-store 境界）に委譲する（`string[]` で順序を保持）。
 * 変更は即時反映し、その後バックグラウンドで保存する（保存失敗でも UI は進む）。
 */
export type ReorderDirection = "up" | "down";

/** ドラッグ&ドロップの落とし先（対象行の前 / 後）。 */
export type ReorderPlace = "before" | "after";

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
  /** 登録 / 解除。登録は**末尾**に足す（既存の並びを崩さない）。 */
  toggleDeviceFavorite: (id: string) => Promise<void>;
  toggleSceneFavorite: (id: string) => Promise<void>;
  /** 1 つ上 / 下へ移動する（キーボードでも操作できる主手段）。端では変化しない。 */
  moveDeviceFavorite: (id: string, direction: ReorderDirection) => Promise<void>;
  moveSceneFavorite: (id: string, direction: ReorderDirection) => Promise<void>;
  /** ドラッグ&ドロップ用。`id` を `targetId` の前 / 後へ移す。 */
  reorderDeviceFavorite: (
    id: string,
    targetId: string,
    place: ReorderPlace,
  ) => Promise<void>;
  reorderSceneFavorite: (
    id: string,
    targetId: string,
    place: ReorderPlace,
  ) => Promise<void>;
  isDeviceFavorite: (id: string) => boolean;
  isSceneFavorite: (id: string) => boolean;
};

/** 登録 / 解除した新しい配列を返す。登録は末尾に足す（不変更新でセレクタを効かせる）。 */
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

/** `id` を `targetId` の前 / 後へ移した新しい配列を返す（ドラッグ&ドロップ）。 */
function reordered(
  ids: string[],
  id: string,
  targetId: string,
  place: ReorderPlace,
): string[] {
  if (id === targetId || !ids.includes(id)) return ids;
  const without = ids.filter((x) => x !== id);
  const at = without.indexOf(targetId);
  if (at < 0) return ids;
  const insertAt = place === "before" ? at : at + 1;
  return [...without.slice(0, insertAt), id, ...without.slice(insertAt)];
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
    reorderDeviceFavorite: async (id, targetId, place) => {
      set((s) => ({ deviceIds: reordered(s.deviceIds, id, targetId, place) }));
      await persist();
    },
    reorderSceneFavorite: async (id, targetId, place) => {
      set((s) => ({ sceneIds: reordered(s.sceneIds, id, targetId, place) }));
      await persist();
    },
    isDeviceFavorite: (id) => get().deviceIds.includes(id),
    isSceneFavorite: (id) => get().sceneIds.includes(id),
  };
});
