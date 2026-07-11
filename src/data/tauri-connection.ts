import { invoke } from "@tauri-apps/api/core";

import type { ConnectionGateway } from "./connection";
import { toError } from "./ipc";
import { type ConnectionState, RATE_LIMIT } from "./types";

/** Rust コマンドが返す接続状態 DTO。秘匿値を含まない。 */
type ConnectionStateDto = {
  saved: boolean;
};

/** 現在時刻を "HH:MM" 表示文字列にする。 */
function nowLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * DTO を view-model へ変換する。lastCheckedAt（テスト成功時刻）は front で付与する。
 * 保存済み、またはテスト成功直後は "connected" 扱いとする。
 */
function toState(dto: ConnectionStateDto, lastCheckedAt: string | null): ConnectionState {
  const connected = dto.saved || lastCheckedAt !== null;
  return {
    status: connected ? "connected" : "disconnected",
    lastCheckedAt,
    saved: dto.saved,
    rateLimit: RATE_LIMIT,
  };
}

/** Tauri IPC 経由の {@link ConnectionGateway} 実装。 */
export const tauriConnectionGateway: ConnectionGateway = {
  async getConnection() {
    const dto = await invoke<ConnectionStateDto>("get_connection_state");
    return toState(dto, null);
  },

  async saveCredentials(token, secret) {
    await invoke("save_credentials", { token, secret });
  },

  async testConnection() {
    try {
      const dto = await invoke<ConnectionStateDto>("test_connection");
      return toState(dto, nowLabel());
    } catch (error) {
      // 安定コード（+ statusCode）を保持したまま投げ直し、表示端で翻訳する。
      throw toError(error);
    }
  },

  async disconnect() {
    await invoke("disconnect");
    return toState({ saved: false }, null);
  },
};
