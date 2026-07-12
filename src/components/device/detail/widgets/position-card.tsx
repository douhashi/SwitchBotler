import { useTranslation } from "react-i18next";

import { type Device } from "@/data";
import { useDeviceStore } from "@/stores/device-store";
import { PercentSliderCard } from "./percent-slider-card";

/** capability: position — カーテンの開度スライダー（0-100）。 */
export function PositionCard({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setPosition = useDeviceStore((s) => s.setPosition);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));

  return (
    <PercentSliderCard
      label={t("position")}
      value={device.controls.position ?? 0}
      disabled={offline}
      onChange={(v) => setPosition(device.id, v)}
    />
  );
}
