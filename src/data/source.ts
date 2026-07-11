import type {
  AirconState,
  Device,
  DeviceCategory,
  DeviceControls,
  IrLightAction,
  Scene,
  SensorReadings,
} from "./types";

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
  /**
   * 赤外線エアコンに温度・モード・風量・電源を一括送信する（setAll）。
   * 赤外線は状態を返さないため turnOn/turnOff は使わず常に全状態を同送する。
   */
  setAircon(id: string, state: AirconState): Promise<void>;
  /**
   * 赤外線ライトに電源・相対明暗の action を送信する（Light / DIY Light）。
   * Light は状態も絶対的な明るさも持たないため、action（on/off/brighter/dimmer）のみ渡す。
   */
  sendIrLight(id: string, action: IrLightAction): Promise<void>;
  /**
   * Bot を 1 回押す（pressMode）。press は ON/OFF 状態を持たない momentary 操作で、
   * 汎用 send_command（press/default/command）で送る。
   */
  pressBot(id: string): Promise<void>;
  getScenes(): Promise<Scene[]>;
  executeScene(id: string): Promise<void>;
  /** すべての Meter 系センサーをセンサーごとに返す。 */
  getSensors(): Promise<SensorReadings[]>;
}
