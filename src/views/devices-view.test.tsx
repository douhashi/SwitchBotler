import { render, screen, waitFor, within } from "@testing-library/react";
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

/** お気に入りリストの行を、表示順のまま名前で返す。 */
function favoriteNames() {
  const list = screen.getByRole("list", { name: "お気に入り" });
  return within(list)
    .getAllByRole("listitem")
    .map((row) => row.getAttribute("aria-label") ?? "");
}

describe("DevicesView お気に入り（1列・並び替え）", () => {
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
    useFavoritesStore.setState({
      deviceIds: ["a", "b", "c"],
      sceneIds: [],
      loaded: true,
    });
  });

  it("お気に入りを登録順の 1 列で描画し、位置を読み上げる", async () => {
    render(<DevicesView />);

    expect(favoriteNames()).toEqual([
      "プラグA、3 件中 1 番目",
      "プラグB、3 件中 2 番目",
      "プラグC、3 件中 3 番目",
    ]);
  });

  it("通常時は並び替えボタンを出さず、「並び替え」で ↑↓ に切り替わる", async () => {
    const user = userEvent.setup();
    render(<DevicesView />);

    // 通常モード: 移動ボタンは無い（行は操作に集中する）。
    expect(screen.queryByRole("button", { name: "プラグA を下へ移動" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "並び替え" }));

    // 並び替えモード: 移動ボタンが出て、操作系（ピン）は引っ込む。
    expect(
      screen.getByRole("button", { name: "プラグA を下へ移動" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "プラグA をお気に入りから外す" })).toBeNull();
  });

  it("↑↓ で並び替わり、順序が永続化される（トレイの表示順にも使う）", async () => {
    const user = userEvent.setup();
    render(<DevicesView />);

    await user.click(screen.getByRole("button", { name: "並び替え" }));
    await user.click(screen.getByRole("button", { name: "プラグA を下へ移動" }));

    await waitFor(() =>
      expect(useFavoritesStore.getState().deviceIds).toEqual(["b", "a", "c"]),
    );
    expect(favoriteNames()).toEqual([
      "プラグB、3 件中 1 番目",
      "プラグA、3 件中 2 番目",
      "プラグC、3 件中 3 番目",
    ]);
    // 再起動後も保つため永続層へ順序ごと保存する。
    await waitFor(() =>
      expect(prefs.get("favoriteDevices")).toEqual(["b", "a", "c"]),
    );
  });

  it("端の行では移動ボタンを無効化する（押せそうで押せない状態を作らない）", async () => {
    const user = userEvent.setup();
    render(<DevicesView />);

    await user.click(screen.getByRole("button", { name: "並び替え" }));

    expect(screen.getByRole("button", { name: "プラグA を上へ移動" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "プラグC を下へ移動" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "プラグA を下へ移動" })).toBeEnabled();
  });

  it("お気に入りが 1 件なら並び替えボタンを出さない", async () => {
    useFavoritesStore.setState({ deviceIds: ["a"], sceneIds: [], loaded: true });
    render(<DevicesView />);

    expect(screen.queryByRole("button", { name: "並び替え" })).toBeNull();
  });
});
