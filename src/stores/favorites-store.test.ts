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

const state = () => useFavoritesStore.getState();

describe("favorites-store", () => {
  beforeEach(() => {
    prefs.clear();
    useFavoritesStore.setState({ deviceIds: [], sceneIds: [], loaded: false });
  });

  it("デバイス・シーンのお気に入りをトグルして永続化する", async () => {
    await state().toggleDeviceFavorite("living-light");
    await state().toggleSceneFavorite("goodnight");

    expect(state().isDeviceFavorite("living-light")).toBe(true);
    expect(state().isSceneFavorite("goodnight")).toBe(true);
    // 永続層（plugin-store）へ id が保存されている。
    expect(prefs.get("favoriteDevices")).toEqual(["living-light"]);
    expect(prefs.get("favoriteScenes")).toEqual(["goodnight"]);

    // 再トグルで解除される。
    await state().toggleDeviceFavorite("living-light");
    expect(state().isDeviceFavorite("living-light")).toBe(false);
    expect(prefs.get("favoriteDevices")).toEqual([]);
  });

  it("登録は末尾に追加され、既存の並びを崩さない", async () => {
    await state().toggleDeviceFavorite("a");
    await state().toggleDeviceFavorite("b");
    await state().toggleDeviceFavorite("c");

    expect(state().deviceIds).toEqual(["a", "b", "c"]);
    expect(prefs.get("favoriteDevices")).toEqual(["a", "b", "c"]);
  });

  it("再読込で永続値が順序ごと復元される（再起動後の並び順保持）", async () => {
    prefs.set("favoriteDevices", ["plug-b", "plug-a"]);
    prefs.set("favoriteScenes", ["movie"]);

    await state().load();

    expect(state().deviceIds).toEqual(["plug-b", "plug-a"]);
    expect(state().sceneIds).toEqual(["movie"]);
    expect(state().loaded).toBe(true);
  });

  it("moveDeviceFavorite で 1 つ上・下へ移動し、並び順を永続化する", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b", "c"] });

    await state().moveDeviceFavorite("c", "up");
    expect(state().deviceIds).toEqual(["a", "c", "b"]);
    expect(prefs.get("favoriteDevices")).toEqual(["a", "c", "b"]);

    await state().moveDeviceFavorite("a", "down");
    expect(state().deviceIds).toEqual(["c", "a", "b"]);
  });

  it("端（先頭で up / 末尾で down）では並びが変わらない", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b"] });

    await state().moveDeviceFavorite("a", "up");
    expect(state().deviceIds).toEqual(["a", "b"]);

    await state().moveDeviceFavorite("b", "down");
    expect(state().deviceIds).toEqual(["a", "b"]);
  });

  it("reorderDeviceFavorite で対象の前 / 後へ差し込む（ドラッグ&ドロップ）", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b", "c", "d"] });

    // d を b の前へ。
    await state().reorderDeviceFavorite("d", "b", "before");
    expect(state().deviceIds).toEqual(["a", "d", "b", "c"]);

    // a を c の後ろへ。
    await state().reorderDeviceFavorite("a", "c", "after");
    expect(state().deviceIds).toEqual(["d", "b", "c", "a"]);
    expect(prefs.get("favoriteDevices")).toEqual(["d", "b", "c", "a"]);
  });

  it("シーンも同じ並び替え API を持つ（#80 の UI から使う）", async () => {
    useFavoritesStore.setState({ sceneIds: ["x", "y", "z"] });

    await state().moveSceneFavorite("z", "up");
    expect(state().sceneIds).toEqual(["x", "z", "y"]);

    await state().reorderSceneFavorite("x", "y", "after");
    expect(state().sceneIds).toEqual(["z", "y", "x"]);
  });
});
