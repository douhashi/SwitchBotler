import {
  AirVent,
  Blinds,
  CircleHelp,
  createLucideIcon,
  Droplet,
  Flame,
  Lightbulb,
  Lock,
  type LucideIcon,
  type LucideProps,
  Plug,
  Snowflake,
  ToggleRight,
  Wind,
} from "lucide-react";

import type { AirconMode, DeviceCategory } from "@/data";

/** デバイス種別 → lucide アイコン対応。 */
const CATEGORY_ICON: Record<DeviceCategory, LucideIcon> = {
  light: Lightbulb,
  plug: Plug,
  curtain: Blinds,
  humidifier: Droplet,
  lock: Lock,
  bot: ToggleRight,
  aircon: AirVent,
  ir_light: Lightbulb,
  other: CircleHelp,
};

/**
 * 「自動」モード用の自作アイコン（A 字グリフ）。
 * Lucide に相当アイコンが無いため、モックの SVG パスを `createLucideIcon` で
 * アイコン化する。他モード（雪/炎/水滴/風）と stroke・サイズ・描画品質を揃える。
 */
const AirconAuto = createLucideIcon("aircon-auto", [
  ["path", { d: "M8.5 16 12 7l3.5 9M9.4 13.5h5.2", key: "aircon-auto-a" }],
]);

/**
 * エアコン運転モード → lucide アイコン対応。冷房/暖房/除湿/送風は既製アイコン、
 * 自動のみ自作 A 字アイコン。CATEGORY_ICON と同じ Record パターンで一元管理する。
 */
export const AIRCON_MODE_ICON: Record<AirconMode, LucideIcon> = {
  auto: AirconAuto,
  cool: Snowflake,
  dry: Droplet,
  fan: Wind,
  heat: Flame,
};

export function DeviceIcon({
  category,
  ...props
}: { category: DeviceCategory } & LucideProps) {
  const Icon = CATEGORY_ICON[category];
  return <Icon {...props} />;
}
