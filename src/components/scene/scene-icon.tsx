import {
  Clapperboard,
  Home,
  type LucideIcon,
  type LucideProps,
  Moon,
  Sunrise,
} from "lucide-react";

import type { SceneIcon as SceneIconId } from "@/data";

/** シーン種別 → lucide アイコン対応。 */
const SCENE_ICON: Record<SceneIconId, LucideIcon> = {
  sleep: Moon,
  home: Home,
  morning: Sunrise,
  movie: Clapperboard,
};

export function SceneIcon({
  icon,
  ...props
}: { icon: SceneIconId } & LucideProps) {
  const Icon = SCENE_ICON[icon];
  return <Icon {...props} />;
}
