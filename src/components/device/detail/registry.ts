import type { FC } from "react";

import type { CapabilityKind, Device } from "@/data";
import { AirconControls } from "./widgets/aircon-controls";
import { BrightnessCard } from "./widgets/brightness-card";
import { ColorCard } from "./widgets/color-card";
import { PositionCard } from "./widgets/position-card";
import { PowerToggle } from "./widgets/power-toggle";
import { RelativeBrightnessCard } from "./widgets/relative-brightness-card";
import { StatusHero } from "./widgets/status-hero";

export type CapabilityWidget = FC<{ device: Device }>;

/**
 * capability.kind → widget のレジストリ。
 * デバイス種別ではなく capability で描画を決めるため、`DeviceDetail` に category 分岐は無い。
 * 操作を増やすときはここに 1 行足す（Open/Closed）。
 */
export const DETAIL_WIDGETS: Record<CapabilityKind, CapabilityWidget> = {
  statusHero: StatusHero,
  power: PowerToggle,
  brightness: BrightnessCard,
  color: ColorCard,
  position: PositionCard,
  climate: AirconControls,
  brightnessRelative: RelativeBrightnessCard,
};
