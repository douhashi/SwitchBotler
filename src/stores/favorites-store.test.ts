import { beforeEach, describe, expect, it, vi } from "vitest";

// plugin-store は外部境界。プロセス内メモリで永続を模し、再読込で保持を検証する。
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

import { useFavoritesStore } from "./favorites-store";

describe("favorites-store", () => {
  beforeEach(() => {
    prefs.clear();
    useFavoritesStore.setState({
      deviceIds: new Set(),
      sceneIds: new Set(),
      loaded: false,
    });
  });

  it("デバイス・シーンのお気に入りをトグルして永続化する", async () => {
    const store = useFavoritesStore.getState();
    await store.toggleDeviceFavorite("living-light");
    await store.toggleSceneFavorite("goodnight");

    expect(useFavoritesStore.getState().deviceIds.has("living-light")).toBe(true);
    expect(useFavoritesStore.getState().sceneIds.has("goodnight")).toBe(true);
    // 永続層（plugin-store）へ id が保存されている。
    expect(prefs.get("favoriteDevices")).toEqual(["living-light"]);
    expect(prefs.get("favoriteScenes")).toEqual(["goodnight"]);

    // 再トグルで解除される。
    await useFavoritesStore.getState().toggleDeviceFavorite("living-light");
    expect(useFavoritesStore.getState().deviceIds.has("living-light")).toBe(false);
    expect(prefs.get("favoriteDevices")).toEqual([]);
  });

  it("再読込で永続値が復元される（再起動後の保持に相当）", async () => {
    prefs.set("favoriteDevices", ["plug-a", "plug-b"]);
    prefs.set("favoriteScenes", ["movie"]);

    await useFavoritesStore.getState().load();

    const state = useFavoritesStore.getState();
    expect([...state.deviceIds]).toEqual(["plug-a", "plug-b"]);
    expect([...state.sceneIds]).toEqual(["movie"]);
    expect(state.loaded).toBe(true);
  });
});
