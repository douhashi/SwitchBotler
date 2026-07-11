import type { SwitchBotlerDataSource } from "@/data/source";
import type { Device, DeviceControls, Scene, SensorReadings } from "@/data/types";
import { DEVICES, SCENES, SENSORS } from "./fixtures";

/** 擬似ネットワークレイテンシ（ms）。 */
const LATENCY = 240;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

/** 呼び出し側が状態を破壊しないよう、返す値は都度コピーする。 */
function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * DataSource のモック実装。
 * 可変な in-memory 状態を保持し、トグル・明るさ変更などが後続の取得に反映される。
 */
class MockDataSource implements SwitchBotlerDataSource {
  private devices: Device[] = clone(DEVICES);
  private scenes: Scene[] = clone(SCENES);
  private sensors: SensorReadings = clone(SENSORS);

  private find(id: string): Device {
    const device = this.devices.find((d) => d.id === id);
    if (!device) throw new Error(`Unknown device: ${id}`);
    return device;
  }

  getDevices(): Promise<Device[]> {
    return delay(clone(this.devices));
  }

  getDeviceStatus(id: string): Promise<Device> {
    return delay(clone(this.find(id)));
  }

  toggleDevice(id: string, on: boolean): Promise<Device> {
    const device = this.find(id);
    device.controls.power = on;
    return delay(clone(device));
  }

  updateDeviceControl(id: string, patch: Partial<DeviceControls>): Promise<Device> {
    const device = this.find(id);
    device.controls = { ...device.controls, ...patch };
    return delay(clone(device));
  }

  getScenes(): Promise<Scene[]> {
    return delay(clone(this.scenes));
  }

  executeScene(id: string): Promise<void> {
    // モックでは副作用なし。存在チェックのみ行う。
    if (!this.scenes.some((s) => s.id === id)) {
      throw new Error(`Unknown scene: ${id}`);
    }
    return delay(undefined);
  }

  getSensors(): Promise<SensorReadings> {
    return delay(clone(this.sensors));
  }
}

export const mockDataSource: SwitchBotlerDataSource = new MockDataSource();
