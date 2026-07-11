import { invoke } from "@tauri-apps/api/core";

import { toError } from "./ipc";
import type { SwitchBotlerDataSource } from "./source";
import type {
  AirconState,
  Device,
  DeviceCategory,
  DeviceControls,
  IrLightAction,
  Scene,
  SensorReadings,
} from "./types";

/** 現在時刻を "HH:MM" 表示文字列にする（センサーの最終更新表示用）。 */
function nowLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Rust の send_command を薄くラップする（commandType は常に "command"）。 */
async function sendCommand(id: string, command: string, parameter: string): Promise<void> {
  try {
    await invoke("send_command", { id, command, parameter, commandType: "command" });
  } catch (error) {
    throw toError(error);
  }
}

/**
 * Tauri IPC 経由の {@link SwitchBotlerDataSource} 実装。
 *
 * 生 JSON → view-model 変換は Rust `mapping.rs` が行い、ここは camelCase DTO を
 * そのまま view-model として扱う（決定1）。エラーは Rust の安全メッセージを
 * {@link toError} で Error 化して投げる（秘匿値なし）。
 */
export const tauriDataSource: SwitchBotlerDataSource = {
  async getDevices() {
    try {
      return await invoke<Device[]>("list_devices");
    } catch (error) {
      throw toError(error);
    }
  },

  async setPower(id: string, category: DeviceCategory, on: boolean) {
    // 鍵は lock/unlock、それ以外は turnOn/turnOff。
    const command =
      category === "lock" ? (on ? "lock" : "unlock") : on ? "turnOn" : "turnOff";
    await sendCommand(id, command, "default");
  },

  async updateControl(id: string, patch: Partial<DeviceControls>) {
    if (patch.brightness !== undefined) {
      await sendCommand(id, "setBrightness", String(patch.brightness));
    }
    if (patch.position !== undefined) {
      await sendCommand(id, "setPosition", String(patch.position));
    }
    if (patch.colorId !== undefined) {
      // parameter は preset id。Rust が "R:G:B" に変換する（決定2）。
      await sendCommand(id, "setColor", patch.colorId);
    }
  },

  async setAircon(id: string, state: AirconState) {
    try {
      // 意味論（mode="cool"/fanSpeed="high"）のまま渡す。setAll の数値エンコードと
      // "{t},{m},{f},{state}" 組み立ては Rust mapping.rs が所有する（決定1）。
      await invoke("send_aircon", {
        id,
        temperature: state.temperature,
        mode: state.mode,
        fanSpeed: state.fanSpeed,
        power: state.power,
      });
    } catch (error) {
      throw toError(error);
    }
  },

  async sendIrLight(id: string, action: IrLightAction) {
    try {
      // action（意味論）のまま渡す。SwitchBot コマンド名への変換は Rust mapping.rs が所有する。
      await invoke("send_ir_light", { id, action });
    } catch (error) {
      throw toError(error);
    }
  },

  async getScenes() {
    try {
      return await invoke<Scene[]>("list_scenes");
    } catch (error) {
      throw toError(error);
    }
  },

  async executeScene(id: string) {
    try {
      await invoke("execute_scene", { id });
    } catch (error) {
      throw toError(error);
    }
  },

  async getSensors(): Promise<SensorReadings[]> {
    try {
      // Rust は { id, source, metrics } の配列を返す。更新時刻はフロントで付与する。
      const dtos = await invoke<Omit<SensorReadings, "updatedAt">[]>("get_sensors");
      const updatedAt = nowLabel();
      return dtos.map((dto) => ({ ...dto, updatedAt }));
    } catch (error) {
      throw toError(error);
    }
  },
};
