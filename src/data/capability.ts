import { hasPowerToggle, type Device } from "./types";

/**
 * デバイス詳細を構成する操作単位（capability）。
 *
 * 画面は category ではなく「デバイスが持つ capability」の合成として描く（Open/Closed）。
 * category 固有の知識は {@link deviceCapabilities} の 1 テーブルに封じ込め、UI・ストア送信は
 * capability に対して多態にする。
 *
 * - power の送信差（toggle / setAll / ir on-off）は store の `setPower` が吸収する。
 * - 絶対明るさ（`brightness`）と相対明暗（`brightnessRelative`）は別 capability として扱う。
 */
export type Capability =
  | { kind: "statusHero" } // アイコン＋状態＋説明の要約
  | { kind: "power" } // 電源トグル（ヘッダに配置）
  | { kind: "brightness" } // 絶対値スライダー 0-100（調光ライト）
  | { kind: "color" } // カラー選択（colorOptions）
  | { kind: "position" } // 開度スライダー 0-100（カーテン）
  | { kind: "climate" } // 温度＋モード＋風量（エアコン。自前 hero を内包）
  | { kind: "brightnessRelative" }; // 明暗ボタン brighter/dimmer（赤外線ライト）

export type CapabilityKind = Capability["kind"];

/**
 * デバイスが持つ capability を順序付きで返す（＝詳細画面の縦並び順）。
 *
 * 「エアコンとは何か」等の category 知識はシステム全体でこの関数だけが持つ。
 * ここに switch を封じ込める代わりに、下流（DeviceDetail / widget / store）は分岐しない。
 *
 * - power は常に配列へ含め、表示側がヘッダへ集約する（決定 C）。出さない機（bot press 等）は
 *   `hasPowerToggle` が false になるため配列に入れない（決定 A: リスト＝真実）。
 * - aircon は climate が hero を兼ねるため statusHero を含めない。
 * - ir_light は電源をヘッダへ、本文は相対明暗のみ（決定 C）。
 */
export function deviceCapabilities(device: Device): Capability[] {
  switch (device.category) {
    case "aircon":
      return [{ kind: "power" }, { kind: "climate" }];
    case "ir_light":
      return [
        { kind: "statusHero" },
        { kind: "power" },
        { kind: "brightnessRelative" },
      ];
    default: {
      const caps: Capability[] = [{ kind: "statusHero" }];
      if (hasPowerToggle(device)) caps.push({ kind: "power" });
      if (device.controls.brightness !== undefined) caps.push({ kind: "brightness" });
      if (device.colorOptions) caps.push({ kind: "color" });
      if (device.controls.position !== undefined) caps.push({ kind: "position" });
      return caps;
    }
  }
}
