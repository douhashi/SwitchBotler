import { create } from "zustand";

import { connectionGateway, type ConnectionState, RATE_LIMIT } from "@/data";

const INITIAL: ConnectionState = {
  status: "disconnected",
  lastCheckedAt: null,
  saved: false,
  rateLimit: RATE_LIMIT,
};

type ConnectionStore = {
  connection: ConnectionState;
  loaded: boolean;
  /** 直近の操作で発生したエラーメッセージ（日本語・秘匿値なし）。 */
  error: string | null;
  /** 初回のみ現在の接続状態を取得する。 */
  load: () => Promise<void>;
  /** Token / Secret を保存し、続けて接続テストを行う。 */
  saveCredentials: (token: string, secret: string) => Promise<void>;
  /** 接続テストを実行する（実行中は status=testing）。 */
  testConnection: () => Promise<void>;
  /** 接続を解除する。 */
  disconnect: () => Promise<void>;
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connection: INITIAL,
  loaded: false,
  error: null,
  load: async () => {
    if (get().loaded) return;
    const connection = await connectionGateway.getConnection();
    set({ connection, loaded: true });
  },
  saveCredentials: async (token, secret) => {
    await connectionGateway.saveCredentials(token, secret);
    // 保存に成功したら続けて疎通を確認する。
    await get().testConnection();
  },
  testConnection: async () => {
    set((s) => ({ connection: { ...s.connection, status: "testing" }, error: null }));
    try {
      const connection = await connectionGateway.testConnection();
      set({ connection, loaded: true, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "接続に失敗しました。";
      set((s) => ({
        connection: { ...s.connection, status: "disconnected", lastCheckedAt: null },
        loaded: true,
        error: message,
      }));
    }
  },
  disconnect: async () => {
    const connection = await connectionGateway.disconnect();
    set({ connection, loaded: true, error: null });
  },
}));
