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

import type { Device } from "@/data";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DevicesView } from "./devices-view";

function plug(id: string, name: string): Device {
  return {
    id,
    name,
    model: "Plug Mini",
    category: "plug",
    supported: true,
    controls: { power: false },
  };
}

const devices = [plug("a", "プラグA"), plug("b", "プラグB"), plug("c", "プラグC")];

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
 * HTML5 DnD を模す。
 *
 * jsdom は `DragEvent` を実装しておらず、RTL の `fireEvent.dragOver(el, { clientY })` では
 * **clientY が落ちる**（＝ドロップ位置が読めない）。イベントを自前で組み立てて渡す。
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
  // 再描画のたびに矩形の細工が失われうるので、位置を読む直前に毎回与え直す。
  layoutRows(zone);
  fireDrag("dragover", zone, { dataTransfer, clientY });
  layoutRows(zone);
  fireDrag("drop", zone, { dataTransfer, clientY });
  fireDrag("dragend", source, { dataTransfer });
}

describe("DevicesView お気に入り（ドロップ先モデル）", () => {
  beforeEach(() => {
    prefs.clear();
    invoke.mockReset();
    invoke.mockResolvedValue(null);
    useNavigationStore.setState({ activeView: "devices", selectedDeviceId: null });
    useDeviceStore.setState({
      devices,
      loading: false,
      loaded: true,
      error: null,
      offlineIds: new Set(),
    });
    useFavoritesStore.setState({ deviceIds: [], sceneIds: [], loaded: true });
  });

  it("お気に入りが空でもセクションを出し、ドラッグを促す（発見性）", () => {
    render(<DevicesView />);

    expect(screen.getByRole("list", { name: "お気に入り" })).toBeInTheDocument();
    expect(
      screen.getByText("よく使うデバイスをここにドラッグして追加"),
    ).toBeInTheDocument();
  });

  it("登録は「移動」: お気に入りへ入れると、その他のセクションから消える", async () => {
    useFavoritesStore.setState({ deviceIds: ["b"], sceneIds: [], loaded: true });
    render(<DevicesView />);

    // b はお気に入り側にだけ居る（重複表示しない＝居場所そのものが状態）。
    expect(rowsOf("お気に入り")).toEqual(["プラグB、1 件中 1 番目"]);
    expect(rowsOf("その他のデバイス")).toEqual(["プラグA", "プラグC"]);
  });

  it("カードをお気に入りへドロップすると登録され、落とした位置が並び順になる", async () => {
    useFavoritesStore.setState({ deviceIds: ["b"], sceneIds: [], loaded: true });
    render(<DevicesView />);

    const zone = screen.getByRole("list", { name: "お気に入り" });
    const cardA = within(screen.getByRole("list", { name: "その他のデバイス" })).getByRole(
      "listitem",
      { name: "プラグA" },
    );

    // 既存行（b: 0〜100）の中点より上へ落とす → 先頭に入る。
    dragTo(cardA, zone, 10);

    await waitFor(() =>
      expect(useFavoritesStore.getState().deviceIds).toEqual(["a", "b"]),
    );
    expect(prefs.get("favoriteDevices")).toEqual(["a", "b"]);
  });

  it("お気に入りの中で落とし直すと並び替えになる（登録と同じ操作）", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b"], sceneIds: [], loaded: true });
    render(<DevicesView />);

    const zone = screen.getByRole("list", { name: "お気に入り" });
    const cardA = within(zone).getByRole("listitem", { name: /プラグA/ });

    // 自分自身は数えないので、b（100〜200）の中点より下へ落とせば末尾になる。
    dragTo(cardA, zone, 160);

    await waitFor(() =>
      expect(useFavoritesStore.getState().deviceIds).toEqual(["b", "a"]),
    );
  });

  it("お気に入りの外（その他）へドロップすると解除される", async () => {
    useFavoritesStore.setState({ deviceIds: ["a", "b"], sceneIds: [], loaded: true });
    render(<DevicesView />);

    const favList = screen.getByRole("list", { name: "お気に入り" });
    const cardA = within(favList).getByRole("listitem", { name: /プラグA/ });
    const removeZone = screen.getByRole("list", { name: "その他のデバイス" });

    dragTo(cardA, removeZone, 10);

    await waitFor(() =>
      expect(useFavoritesStore.getState().deviceIds).toEqual(["b"]),
    );
  });

  it("右クリック（コンテキストメニュー）でも登録できる＝ドラッグのキーボード代替", async () => {
    const user = userEvent.setup();
    render(<DevicesView />);

    const cardA = screen.getByRole("listitem", { name: "プラグA" });
    fireEvent.contextMenu(cardA);

    await user.click(await screen.findByRole("menuitem", { name: "お気に入りに追加" }));

    await waitFor(() =>
      expect(useFavoritesStore.getState().deviceIds).toEqual(["a"]),
    );
  });

  it("「並び替え」は並び替えだけを担う（↑↓ のみ。登録・解除は持ち込まない）", async () => {
    const user = userEvent.setup();
    useFavoritesStore.setState({
      deviceIds: ["a", "b", "c"],
      sceneIds: [],
      loaded: true,
    });
    render(<DevicesView />);

    await user.click(screen.getByRole("button", { name: "並び替え" }));

    // 並び替えの道具だけが出る。
    expect(screen.getByRole("button", { name: "プラグA を下へ移動" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "プラグA を上へ移動" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "プラグC を下へ移動" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "プラグA を下へ移動" }));

    await waitFor(() =>
      expect(useFavoritesStore.getState().deviceIds).toEqual(["b", "a", "c"]),
    );
    expect(rowsOf("お気に入り")).toEqual([
      "プラグB、3 件中 1 番目",
      "プラグA、3 件中 2 番目",
      "プラグC、3 件中 3 番目",
    ]);
    expect(prefs.get("favoriteDevices")).toEqual(["b", "a", "c"]);
  });

  it("お気に入りが 1 件なら並び替えボタンを出さない", () => {
    useFavoritesStore.setState({ deviceIds: ["a"], sceneIds: [], loaded: true });
    render(<DevicesView />);

    expect(screen.queryByRole("button", { name: "並び替え" })).toBeNull();
  });
});
