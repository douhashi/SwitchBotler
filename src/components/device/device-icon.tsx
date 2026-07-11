import {
  Blinds,
  Droplet,
  Lightbulb,
  Lock,
  type LucideIcon,
  type LucideProps,
  Wind,
} from "lucide-react";

import type { DeviceCategory } from "@/data";

/** デバイス種別 → lucide アイコン対応。 */
const CATEGORY_ICON: Record<DeviceCategory, LucideIcon> = {
  light: Lightbulb,
  fan: Wind,
  curtain: Blinds,
  humidifier: Droplet,
  lock: Lock,
};

export function DeviceIcon({
  category,
  ...props
}: { category: DeviceCategory } & LucideProps) {
  const Icon = CATEGORY_ICON[category];
  return <Icon {...props} />;
}
