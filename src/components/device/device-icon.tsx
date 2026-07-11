import {
  AirVent,
  Blinds,
  CircleHelp,
  Droplet,
  Lightbulb,
  Lock,
  type LucideIcon,
  type LucideProps,
  Plug,
  ToggleRight,
} from "lucide-react";

import type { DeviceCategory } from "@/data";

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

export function DeviceIcon({
  category,
  ...props
}: { category: DeviceCategory } & LucideProps) {
  const Icon = CATEGORY_ICON[category];
  return <Icon {...props} />;
}
