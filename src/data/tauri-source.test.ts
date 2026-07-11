import { beforeEach, describe, expect, it, vi } from "vitest";

// Tauri IPC（invoke）は外部境界。ここだけをモックする。
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { tauriDataSource } from "./tauri-source";

describe("tauriDataSource", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("setPower は鍵に lock/unlock、それ以外に turnOn/turnOff を送る", async () => {
    invoke.mockResolvedValue(null);

    await tauriDataSource.setPower("d1", "plug", true);
    expect(invoke).toHaveBeenLastCalledWith("send_command", {
      id: "d1",
      command: "turnOn",
      parameter: "default",
      commandType: "command",
    });

    await tauriDataSource.setPower("d2", "lock", false);
    expect(invoke).toHaveBeenLastCalledWith("send_command", {
      id: "d2",
      command: "unlock",
      parameter: "default",
      commandType: "command",
    });
  });

  it("updateControl は brightness/position/colorId を対応コマンドへ変換する", async () => {
    invoke.mockResolvedValue(null);

    await tauriDataSource.updateControl("d1", { brightness: 40 });
    expect(invoke).toHaveBeenLastCalledWith("send_command", {
      id: "d1",
      command: "setBrightness",
      parameter: "40",
      commandType: "command",
    });

    // colorId は preset id をそのまま渡し、"R:G:B" 変換は Rust が行う。
    await tauriDataSource.updateControl("d1", { colorId: "warm" });
    expect(invoke).toHaveBeenLastCalledWith("send_command", {
      id: "d1",
      command: "setColor",
      parameter: "warm",
      commandType: "command",
    });
  });

  it("setAircon は send_aircon を意味論のままの引数で呼ぶ（数値エンコードは Rust）", async () => {
    invoke.mockResolvedValue(null);

    await tauriDataSource.setAircon("ac1", {
      power: true,
      temperature: 24,
      mode: "heat",
      fanSpeed: "high",
    });

    expect(invoke).toHaveBeenLastCalledWith("send_aircon", {
      id: "ac1",
      temperature: 24,
      mode: "heat",
      fanSpeed: "high",
      power: true,
    });
  });

  it("invoke の reject を Rust の安全メッセージ付き Error へ変換する", async () => {
    invoke.mockRejectedValue({ code: "unauthorized", message: "認証情報またはリクエスト上限を確認してください。" });

    await expect(tauriDataSource.getDevices()).rejects.toThrow(
      "認証情報またはリクエスト上限を確認してください。",
    );
  });

  it("message を持たない reject でも安全なフォールバック文言になる", async () => {
    invoke.mockRejectedValue("boom");

    await expect(tauriDataSource.getScenes()).rejects.toThrow(
      "SwitchBot API との通信に失敗しました。",
    );
  });

  it("getSensors はセンサーごとに updatedAt を付与して返す", async () => {
    invoke.mockResolvedValue([
      {
        id: "s1",
        source: "meter",
        metrics: [
          { kind: "gauge", id: "temperature", label: "温度", icon: "temperature", value: 26.2, unit: "°C" },
        ],
      },
    ]);

    const readings = await tauriDataSource.getSensors();
    expect(readings).toHaveLength(1);
    expect(readings[0].id).toBe("s1");
    expect(readings[0].source).toBe("meter");
    expect(readings[0].metrics).toHaveLength(1);
    expect(readings[0].updatedAt).toMatch(/^\d{2}:\d{2}$/);
  });
});
