import type { Device, DeviceCategory, DeviceControls, Scene, SensorReadings } from "./types";

/**
 * デバイス / シーン / センサーのデータ境界。実体は Tauri IPC 実装
 * （`tauri-source.ts`）で、Rust バックエンドが署名・API 通信・生 JSON → view-model
 * 変換を担う。ビュー・ストア・フックはこの interface のみに依存する。
 *
 * 認証（接続）まわりは責務を分離し {@link ConnectionGateway} が担う。
 *
 * 操作系（setPower / updateControl）は成否のみを返す（void）。SwitchBot クラウドの
 * status はコマンド後に反映遅延があるため、直後の再取得はせずストア側で楽観更新する。
 */
export interface SwitchBotlerDataSource {
  getDevices(): Promise<Device[]>;
  /** 電源を操作する。カテゴリで turnOn/turnOff・鍵の lock/unlock を出し分ける。 */
  setPower(id: string, category: DeviceCategory, on: boolean): Promise<void>;
  /** 明るさ・開度・カラーを操作する。 */
  updateControl(id: string, patch: Partial<DeviceControls>): Promise<void>;
  getScenes(): Promise<Scene[]>;
  executeScene(id: string): Promise<void>;
  getSensors(): Promise<SensorReadings>;
}
