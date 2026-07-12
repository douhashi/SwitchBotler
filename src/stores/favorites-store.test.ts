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

  it("place は未登録なら登録、登録済みなら移動（ドロップ位置＝並び順）", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b", "c"] });

    // 未登録の d を先頭へドロップ → 登録される。
    await state().placeDeviceFavorite("d", 0);
    expect(state().deviceIds).toEqual(["d", "a", "b", "c"]);

    // 登録済みの d を 2 番目へドロップ → 移動する（重複しない）。
    await state().placeDeviceFavorite("d", 2);
    expect(state().deviceIds).toEqual(["a", "b", "d", "c"]);

    // 範囲外の index は端にクランプされる。
    await state().placeDeviceFavorite("a", 99);
    expect(state().deviceIds).toEqual(["b", "d", "c", "a"]);
    expect(prefs.get("favoriteDevices")).toEqual(["b", "d", "c", "a"]);
  });

  it("removeDeviceFavorite で外す（セクションの外へドロップ相当）", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b", "c"] });

    await state().removeDeviceFavorite("b");
    expect(state().deviceIds).toEqual(["a", "c"]);
    expect(prefs.get("favoriteDevices")).toEqual(["a", "c"]);
  });

  it("シーンも同じ API を持つ（#80 の UI から使う）", async () => {
    useFavoritesStore.setState({ sceneIds: ["x", "y", "z"] });

    await state().moveSceneFavorite("z", "up");
    expect(state().sceneIds).toEqual(["x", "z", "y"]);

    await state().placeSceneFavorite("x", 2);
    expect(state().sceneIds).toEqual(["z", "y", "x"]);

    await state().removeSceneFavorite("y");
    expect(state().sceneIds).toEqual(["z", "x"]);
  });
});
