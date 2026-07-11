import { create } from "zustand";

import { loadFavorites, saveFavorites } from "@/data/preferences";

/**
 * お気に入り（デバイス / シーンの id 集合）ストア。
 *
 * 対象は **デバイスとシーン（id ベース）**（PO 決定2: アクション単位は不採用）。
 * 永続化は `data/preferences.ts`（plugin-store 境界）に委譲する。
 * トグルは即時反映し、その後バックグラウンドで保存する（保存失敗でも UI は進む）。
 */
type FavoritesState = {
  deviceIds: Set<string>;
  sceneIds: Set<string>;
  loaded: boolean;
  /** 初回のみ永続値を読み込む。 */
  load: () => Promise<void>;
  /** 明示的に再読込する（別ウィンドウでの変更を取り込む）。 */
  reload: () => Promise<void>;
  toggleDeviceFavorite: (id: string) => Promise<void>;
  toggleSceneFavorite: (id: string) => Promise<void>;
  isDeviceFavorite: (id: string) => boolean;
  isSceneFavorite: (id: string) => boolean;
};

/** 集合をトグルした新しい Set を返す（不変更新でセレクタ再評価を効かせる）。 */
function toggled(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => {
  const persist = () =>
    saveFavorites({
      deviceIds: [...get().deviceIds],
      sceneIds: [...get().sceneIds],
    }).catch(() => {
      // 保存失敗は致命ではない（次回操作で再保存される）。UI は既に反映済み。
    });

  return {
    deviceIds: new Set(),
    sceneIds: new Set(),
    loaded: false,
    load: async () => {
      if (get().loaded) return;
      await get().reload();
    },
    reload: async () => {
      try {
        const { deviceIds, sceneIds } = await loadFavorites();
        set({
          deviceIds: new Set(deviceIds),
          sceneIds: new Set(sceneIds),
          loaded: true,
        });
      } catch {
        // 読込失敗時は空のまま進む（トレイ / 一覧は先頭 N 台補完で機能する）。
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
    isDeviceFavorite: (id) => get().deviceIds.has(id),
    isSceneFavorite: (id) => get().sceneIds.has(id),
  };
});
