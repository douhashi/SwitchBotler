import type {
  ConnectionState,
  Device,
  DeviceControls,
  Scene,
  SensorReadings,
} from "./types";

/**
 * アプリが依存する唯一のデータ境界。
 *
 * 現状はモック実装（src/mocks）が背後に居るが、#9 で Tauri IPC 実装へ
 * 差し替える。差し替え点は src/data/index.ts の 1 箇所のみ。
 * ビュー・ストア・フックはこの interface のみに依存する。
 */
export interface SwitchBotlerDataSource {
  getDevices(): Promise<Device[]>;
  getDeviceStatus(id: string): Promise<Device>;
  toggleDevice(id: string, on: boolean): Promise<Device>;
  updateDeviceControl(id: string, patch: Partial<DeviceControls>): Promise<Device>;
  getScenes(): Promise<Scene[]>;
  executeScene(id: string): Promise<void>;
  getSensors(): Promise<SensorReadings>;
  getConnection(): Promise<ConnectionState>;
  testConnection(): Promise<ConnectionState>;
  disconnect(): Promise<ConnectionState>;
}
