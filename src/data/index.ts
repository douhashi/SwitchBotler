import { mockDataSource } from "@/mocks/mock-source";
import type { SwitchBotlerDataSource } from "./source";

/**
 * アプリが参照する唯一のデータソース。ここが実装差し替えの単一境界。
 * 現状はモック実装を指す。#9 で Tauri IPC 実装に差し替える（この 1 行のみ変更）。
 */
export const dataSource: SwitchBotlerDataSource = mockDataSource;

export type { SwitchBotlerDataSource } from "./source";
export * from "./types";
export { useScenes, useSensors } from "./hooks";
