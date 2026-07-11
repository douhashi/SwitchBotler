import { mockDataSource } from "@/mocks/mock-source";
import type { ConnectionGateway } from "./connection";
import type { SwitchBotlerDataSource } from "./source";
import { tauriConnectionGateway } from "./tauri-connection";

/**
 * デバイス / シーン / センサーのデータソース。ここが実装差し替えの単一境界。
 * 現状はモック実装を指す。#9 で Tauri IPC 実装に差し替える（この 1 行のみ変更）。
 */
export const dataSource: SwitchBotlerDataSource = mockDataSource;

/**
 * 接続（認証）まわりのゲートウェイ。M1 で Tauri IPC 実装に結線済み。
 * Rust バックエンドが署名生成・keyring 保管・API 通信を担う。
 */
export const connectionGateway: ConnectionGateway = tauriConnectionGateway;

export type { SwitchBotlerDataSource } from "./source";
export type { ConnectionGateway } from "./connection";
export * from "./types";
export { useScenes, useSensors } from "./hooks";
