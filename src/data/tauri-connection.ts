import { invoke } from "@tauri-apps/api/core";

import type { ConnectionGateway } from "./connection";
import { type ConnectionState, RATE_LIMIT } from "./types";

/** Rust コマンドが返す接続状態 DTO。秘匿値を含まない。 */
type ConnectionStateDto = {
  saved: boolean;
};

/** Rust の SwitchBotError シリアライズ形（`{ code, message }`）。 */
type RustError = {
  code?: string;
  message?: string;
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

/**
 * invoke の reject 値から利用者向けの安全な日本語メッセージを取り出す。
 * Rust 側で秘匿値を含まない文言に整形済みのため、それをそのまま使う。
 */
function toMessage(error: unknown): string {
  const fallback = "SwitchBot API との通信に失敗しました。";
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as RustError).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
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
      throw new Error(toMessage(error));
    }
  },

  async disconnect() {
    await invoke("disconnect");
    return toState({ saved: false }, null);
  },
};
