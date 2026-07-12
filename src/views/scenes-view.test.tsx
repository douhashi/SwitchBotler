import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックし、ビュー〜ストア〜データ層は実物を通す。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

// plugin-store も外部境界。プロセス内メモリで永続を模し、並び順の保存を検証する。
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

import { useFavoritesStore } from "@/stores/favorites-store";
import { ScenesView } from "./scenes-view";

const scenes = [
  { id: "a", name: "おやすみ" },
  { id: "b", name: "帰宅" },
  { id: "c", name: "おはよう" },
];

/** 指定セクションの行を表示順のラベルで返す。 */
function rowsOf(name: string) {
  const list = screen.getByRole("list", { name });
  return within(list)
    .getAllByRole("listitem")
    .map((row) => row.getAttribute("aria-label") ?? "");
}

/**
 * jsdom はレイアウトを持たず getBoundingClientRect が常に 0 を返すため、
 * 「落とした位置＝並び順」の判定に必要な行の矩形だけを与える（1 行 = 高さ 100）。
 */
function layoutRows(zone: HTMLElement) {
  zone.querySelectorAll<HTMLElement>("[data-fav-id]").forEach((row, i) => {
    row.getBoundingClientRect = () =>
      ({ top: i * 100, height: 100, bottom: i * 100 + 100 }) as DOMRect;
  });
}

/**
 * HTML5 DnD を模す。jsdom は `DragEvent` を実装しておらず、
 * `fireEvent.dragOver(el, { clientY })` では clientY が落ちるため自前で組み立てる。
 */
function fireDrag(type: string, target: HTMLElement, props: object) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, props);
  fireEvent(target, event);
}

function dragTo(source: HTMLElement, zone: HTMLElement, clientY: number) {
  const dataTransfer = {
    data: {} as Record<string, string>,
    effectAllowed: "",
    dropEffect: "",
    setData(k: string, v: string) {
      this.data[k] = v;
    },
    getData(k: string) {
      return this.data[k];
    },
  };
  fireDrag("dragstart", source, { dataTransfer });
  layoutRows(zone);
  fireDrag("dragover", zone, { dataTransfer, clientY });
  layoutRows(zone);
  fireDrag("drop", zone, { dataTransfer, clientY });
  fireDrag("dragend", source, { dataTransfer });
}

describe("ScenesView お気に入り（デバイスと同じドロップ先モデル）", () => {
  beforeEach(() => {
    prefs.clear();
    invoke.mockReset();
    invoke.mockImplementation(async (cmd: string) =>
      cmd === "list_scenes" ? scenes : null,
    );
    useFavoritesStore.setState({ deviceIds: [], sceneIds: [], loaded: true });
  });

  it("お気に入りが空でもセクションを出し、ドラッグを促す（発見性）", async () => {
    render(<ScenesView />);

    expect(await screen.findByRole("list", { name: "お気に入り" })).toBeInTheDocument();
    expect(screen.getByText("よく使うものをここにドラッグして追加")).toBeInTheDocument();
  });

  it("登録は「移動」: お気に入りへ入れると、その他のセクションから消える", async () => {
    useFavoritesStore.setState({ deviceIds: [], sceneIds: ["b"], loaded: true });
    render(<ScenesView />);

    await screen.findByRole("list", { name: "お気に入り" });
    expect(rowsOf("お気に入り")).toEqual(["帰宅、1 件中 1 番目"]);
    expect(rowsOf("その他のシーン")).toEqual(["おやすみ", "おはよう"]);
  });

  it("シーンをお気に入りへドロップすると登録され、落とした位置が並び順になる", async () => {
    useFavoritesStore.setState({ deviceIds: [], sceneIds: ["b"], loaded: true });
    render(<ScenesView />);

    const zone = await screen.findByRole("list", { name: "お気に入り" });
    const rowA = within(screen.getByRole("list", { name: "その他のシーン" })).getByRole(
      "listitem",
      { name: "おやすみ" },
    );

    // 既存行（帰宅: 0〜100）の中点より上へ落とす → 先頭に入る。
    dragTo(rowA, zone, 10);

    await waitFor(() => expect(useFavoritesStore.getState().sceneIds).toEqual(["a", "b"]));
    expect(prefs.get("favoriteScenes")).toEqual(["a", "b"]);
  });

  it("お気に入りの外（その他）へドロップすると解除される", async () => {
    useFavoritesStore.setState({ deviceIds: [], sceneIds: ["a", "b"], loaded: true });
    render(<ScenesView />);

    const favList = await screen.findByRole("list", { name: "お気に入り" });
    const rowA = within(favList).getByRole("listitem", { name: /おやすみ/ });

    dragTo(rowA, screen.getByRole("list", { name: "その他のシーン" }), 10);

    await waitFor(() => expect(useFavoritesStore.getState().sceneIds).toEqual(["b"]));
  });

  it("右クリック（コンテキストメニュー）でも登録できる＝ドラッグのキーボード代替", async () => {
    const user = userEvent.setup();
    render(<ScenesView />);

    fireEvent.contextMenu(await screen.findByRole("listitem", { name: "おやすみ" }));

    await user.click(await screen.findByRole("menuitem", { name: "お気に入りに追加" }));

    await waitFor(() => expect(useFavoritesStore.getState().sceneIds).toEqual(["a"]));
  });

  it("「並び替え」は ↑↓ だけを担い、並び順を永続化する", async () => {
    const user = userEvent.setup();
    useFavoritesStore.setState({ deviceIds: [], sceneIds: ["a", "b", "c"], loaded: true });
    render(<ScenesView />);

    await user.click(await screen.findByRole("button", { name: "並び替え" }));

    expect(screen.getByRole("button", { name: "おやすみ を上へ移動" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "おはよう を下へ移動" })).toBeDisabled();
    // 並び替え中は「実行」を出さない（並び替えに集中させる）。
    expect(screen.queryByRole("button", { name: "実行" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "おやすみ を下へ移動" }));

    await waitFor(() =>
      expect(useFavoritesStore.getState().sceneIds).toEqual(["b", "a", "c"]),
    );
    expect(rowsOf("お気に入り")).toEqual([
      "帰宅、3 件中 1 番目",
      "おやすみ、3 件中 2 番目",
      "おはよう、3 件中 3 番目",
    ]);
    expect(prefs.get("favoriteScenes")).toEqual(["b", "a", "c"]);
  });
});
