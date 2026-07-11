import { create } from "zustand";

import { type ConnectionState, dataSource } from "@/data";

const INITIAL: ConnectionState = {
  status: "disconnected",
  lastCheckedAt: null,
  rateRemaining: 0,
  rateLimit: 10000,
  tokenMasked: "",
  secretMasked: "",
};

type ConnectionStore = {
  connection: ConnectionState;
  loaded: boolean;
  /** 初回のみ現在の接続状態を取得する。 */
  load: () => Promise<void>;
  /** 接続テストを実行する（実行中は status=testing）。 */
  testConnection: () => Promise<void>;
  /** 接続を解除する。 */
  disconnect: () => Promise<void>;
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connection: INITIAL,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    const connection = await dataSource.getConnection();
    set({ connection, loaded: true });
  },
  testConnection: async () => {
    set((s) => ({ connection: { ...s.connection, status: "testing" } }));
    const connection = await dataSource.testConnection();
    set({ connection, loaded: true });
  },
  disconnect: async () => {
    const connection = await dataSource.disconnect();
    set({ connection, loaded: true });
  },
}));
