import { afterEach, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { errorCodeOf, statusCodeOf } from "@/i18n/error";
import { AppError } from "@/data/ipc";

import enCommon from "./locales/en/common.json";
import enConnection from "./locales/en/connection.json";
import enDevices from "./locales/en/devices.json";
import enErrors from "./locales/en/errors.json";
import enOnboarding from "./locales/en/onboarding.json";
import enScenes from "./locales/en/scenes.json";
import enSensors from "./locales/en/sensors.json";
import enSettings from "./locales/en/settings.json";
import enTray from "./locales/en/tray.json";
import jaCommon from "./locales/ja/common.json";
import jaConnection from "./locales/ja/connection.json";
import jaDevices from "./locales/ja/devices.json";
import jaErrors from "./locales/ja/errors.json";
import jaOnboarding from "./locales/ja/onboarding.json";
import jaScenes from "./locales/ja/scenes.json";
import jaSensors from "./locales/ja/sensors.json";
import jaSettings from "./locales/ja/settings.json";
import jaTray from "./locales/ja/tray.json";

type Json = Record<string, unknown>;

/** i18next の複数形サフィックス（言語間で数が異なるため比較時に正規化する）。 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** ネストした JSON を "a.b.c" のリーフキー集合へ平坦化し、複数形サフィックスは正規化する。 */
function flattenKeys(obj: Json, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const k of flattenKeys(value as Json, path)) keys.add(k);
    } else {
      keys.add(path.replace(PLURAL_SUFFIX, ""));
    }
  }
  return keys;
}

const NAMESPACES: Record<string, { ja: Json; en: Json }> = {
  common: { ja: jaCommon, en: enCommon },
  settings: { ja: jaSettings, en: enSettings },
  connection: { ja: jaConnection, en: enConnection },
  onboarding: { ja: jaOnboarding, en: enOnboarding },
  devices: { ja: jaDevices, en: enDevices },
  scenes: { ja: jaScenes, en: enScenes },
  sensors: { ja: jaSensors, en: enSensors },
  tray: { ja: jaTray, en: enTray },
  errors: { ja: jaErrors, en: enErrors },
};

afterEach(() => {
  void i18n.changeLanguage("ja");
});

describe("翻訳リソースのキー整合（V4/V5）", () => {
  it.each(Object.keys(NAMESPACES))(
    "%s namespace は ja/en でキー集合が一致する",
    (ns) => {
      const { ja, en } = NAMESPACES[ns];
      const jaKeys = [...flattenKeys(ja)].sort();
      const enKeys = [...flattenKeys(en)].sort();
      expect(jaKeys).toEqual(enKeys);
    },
  );

  it("主要画面のタイトルが ja/en 双方で翻訳される（キー欠落なし）", () => {
    const titles: [string, string, string][] = [
      // [ns:key, ja, en]
      ["settings:title", "設定", "Settings"],
      ["devices:title", "デバイス", "Devices"],
      ["scenes:title", "シーン", "Scenes"],
      ["sensors:title", "センサー", "Sensors"],
    ];
    for (const [key, ja, en] of titles) {
      i18n.changeLanguage("ja");
      expect(i18n.t(key)).toBe(ja);
      i18n.changeLanguage("en");
      expect(i18n.t(key)).toBe(en);
    }
  });
});

describe("エラーコードのマッピング整合（V2）", () => {
  // Rust `switchbot/error.rs` の ErrorCode（serde camelCase）+ フロント固有の unknown。
  const RUST_CODES = [
    "unauthorized",
    "rateLimited",
    "apiStatus",
    "offline",
    "network",
    "storage",
    "missingCredentials",
  ] as const;

  it("errors namespace が全 Rust コード + unknown を ja/en で網羅する", () => {
    const expected = [...RUST_CODES, "unknown"].sort();
    for (const lang of ["ja", "en"] as const) {
      const keys = [...flattenKeys(NAMESPACES.errors[lang])].sort();
      expect(keys).toEqual(expected);
    }
  });

  it("errorCodeOf は既知コードを保持し、未知・非 AppError は unknown に寄せる", () => {
    for (const code of RUST_CODES) {
      expect(errorCodeOf(new AppError("diag", code))).toBe(code);
    }
    expect(errorCodeOf(new AppError("diag", "somethingElse"))).toBe("unknown");
    expect(errorCodeOf(new AppError("diag"))).toBe("unknown");
    expect(errorCodeOf(new Error("plain"))).toBe("unknown");
    expect(errorCodeOf("boom")).toBe("unknown");
  });

  it("statusCodeOf は AppError の statusCode を取り出す", () => {
    expect(statusCodeOf(new AppError("diag", "apiStatus", 190))).toBe(190);
    expect(statusCodeOf(new AppError("diag", "network"))).toBeUndefined();
    expect(statusCodeOf("boom")).toBeUndefined();
  });
});

describe("補間・複数形（V1/V6）", () => {
  it("接続済み · N台 が ja/en で複数形/補間される", () => {
    i18n.changeLanguage("ja");
    expect(i18n.t("common:states.connectedCount", { count: 3 })).toBe(
      "接続済み · 3台",
    );
    i18n.changeLanguage("en");
    expect(i18n.t("common:states.connectedCount", { count: 1 })).toBe(
      "Connected · 1 device",
    );
    expect(i18n.t("common:states.connectedCount", { count: 3 })).toBe(
      "Connected · 3 devices",
    );
  });

  it("接続バナーの上限文言が limit / lastChecked を補間する", () => {
    i18n.changeLanguage("ja");
    const ja = i18n.t("connection:banner.connectedDetail", {
      lastChecked: "10:00",
      limit: "10,000",
    });
    expect(ja).toContain("10,000");
    expect(ja).toContain("10:00");
    expect(ja).toContain("上限");
    i18n.changeLanguage("en");
    const en = i18n.t("connection:banner.connectedDetail", {
      lastChecked: "10:00",
      limit: "10,000",
    });
    expect(en).toContain("10,000");
    expect(en).toContain("day");
  });

  it("apiStatus が statusCode を補間する（番号を失わない）", () => {
    i18n.changeLanguage("ja");
    expect(i18n.t("errors:apiStatus", { statusCode: 190 })).toBe(
      "SwitchBot API がエラーを返しました（コード 190）。",
    );
    i18n.changeLanguage("en");
    expect(i18n.t("errors:apiStatus", { statusCode: 190 })).toBe(
      "SwitchBot API returned an error (code 190).",
    );
  });

  it("device-detail hero が mode/fan/brightness/color を補間する", () => {
    i18n.changeLanguage("ja");
    expect(
      i18n.t("devices:hero.aircon", { mode: "冷房", fan: "強" }),
    ).toBe("冷房 · 風量強");
    expect(
      i18n.t("devices:hero.brightnessColor", { brightness: 50, color: "電球色" }),
    ).toBe("明るさ 50% · 電球色");
    i18n.changeLanguage("en");
    expect(
      i18n.t("devices:hero.brightnessColor", { brightness: 50, color: "Warm White" }),
    ).toBe("Brightness 50% · Warm White");
  });

  it("changeLanguage はリロードなしで即時に翻訳言語を切り替える（V1）", () => {
    i18n.changeLanguage("ja");
    expect(i18n.t("common:actions.save")).toBe("保存");
    i18n.changeLanguage("en");
    expect(i18n.t("common:actions.save")).toBe("Save");
  });
});

describe("Rust 由来ラベルのフロント文言化（V4）", () => {
  it("センサー計測ラベル（icon キー）が ja/en で解決される", () => {
    const metrics: [string, string, string][] = [
      ["temperature", "温度", "Temperature"],
      ["humidity", "湿度", "Humidity"],
      ["battery", "バッテリー", "Battery"],
      ["motion", "人感", "Motion"],
      ["brightness", "明るさ", "Brightness"],
    ];
    for (const [icon, ja, en] of metrics) {
      i18n.changeLanguage("ja");
      expect(i18n.t(`sensors:metric.${icon}`)).toBe(ja);
      i18n.changeLanguage("en");
      expect(i18n.t(`sensors:metric.${icon}`)).toBe(en);
    }
  });

  it("センサー状態テキスト（icon+state キー）が ja/en で解決される", () => {
    i18n.changeLanguage("ja");
    expect(i18n.t("sensors:state.motion.active")).toBe("検知あり");
    expect(i18n.t("sensors:state.motion.idle")).toBe("検知なし");
    expect(i18n.t("sensors:state.brightness.bright")).toBe("明るい");
    expect(i18n.t("sensors:state.brightness.dim")).toBe("暗い");
    i18n.changeLanguage("en");
    expect(i18n.t("sensors:state.motion.active")).toBe("Detected");
    expect(i18n.t("sensors:state.brightness.dim")).toBe("Dim");
  });

  it("カラー名（colorId キー）6件が ja/en で解決される", () => {
    const colors: [string, string, string][] = [
      ["warm", "電球色", "Warm White"],
      ["neutral", "昼白色", "Natural White"],
      ["cool", "昼光色", "Cool White"],
      ["red", "レッド", "Red"],
      ["green", "グリーン", "Green"],
      ["purple", "パープル", "Purple"],
    ];
    for (const [id, ja, en] of colors) {
      i18n.changeLanguage("ja");
      expect(i18n.t(`devices:colorName.${id}`)).toBe(ja);
      i18n.changeLanguage("en");
      expect(i18n.t(`devices:colorName.${id}`)).toBe(en);
    }
  });
});
