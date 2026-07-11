import { describe, expect, it } from "vitest";

import {
  CHROME_ALLOWANCE,
  clampHeight,
  DEVICE_MAX_HEIGHT,
  MAX_TRAY_HEIGHT,
  SCENE_MAX_HEIGHT,
  shouldShowFade,
} from "./layout";

describe("clampHeight", () => {
  it("content < max はそのまま返す", () => {
    expect(clampHeight(200, MAX_TRAY_HEIGHT)).toBe(200);
  });

  it("content = max は max を返す", () => {
    expect(clampHeight(MAX_TRAY_HEIGHT, MAX_TRAY_HEIGHT)).toBe(MAX_TRAY_HEIGHT);
  });

  it("content > max は max にクランプする", () => {
    expect(clampHeight(MAX_TRAY_HEIGHT + 200, MAX_TRAY_HEIGHT)).toBe(
      MAX_TRAY_HEIGHT,
    );
  });
});

describe("MAX_TRAY_HEIGHT", () => {
  it("内側リスト上限 + chrome 許容の合計として定義される（式で明示）", () => {
    expect(MAX_TRAY_HEIGHT).toBe(
      DEVICE_MAX_HEIGHT + SCENE_MAX_HEIGHT + CHROME_ALLOWANCE,
    );
  });
});

describe("shouldShowFade", () => {
  it("続きがある（最下端に未到達）ときは true", () => {
    expect(shouldShowFade(0, 300, 600)).toBe(true);
  });

  it("最下端に到達したら false", () => {
    expect(shouldShowFade(300, 300, 600)).toBe(false);
  });

  it("オーバーフローしていない（内容が収まる）ときは false", () => {
    expect(shouldShowFade(0, 200, 200)).toBe(false);
  });
});
