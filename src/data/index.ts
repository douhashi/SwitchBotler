import type { ConnectionGateway } from "./connection";
import type { SwitchBotlerDataSource } from "./source";
import { tauriConnectionGateway } from "./tauri-connection";
import { tauriDataSource } from "./tauri-source";

/**
 * デバイス / シーン / センサーのデータソース。ここが実装差し替えの単一境界。
 * M2/M3 で Tauri IPC 実装（Rust バックエンド）に結線済み。
 */
export const dataSource: SwitchBotlerDataSource = tauriDataSource;

/**
 * 接続（認証）まわりのゲートウェイ。M1 で Tauri IPC 実装に結線済み。
 * Rust バックエンドが署名生成・keyring 保管・API 通信を担う。
 */
export const connectionGateway: ConnectionGateway = tauriConnectionGateway;

export type { SwitchBotlerDataSource } from "./source";
export type { ConnectionGateway } from "./connection";
export * from "./types";
export * from "./capability";
export { useScenes, useSensors } from "./hooks";
