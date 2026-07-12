import { useTranslation } from "react-i18next";

import { type Device } from "@/data";
import { useDeviceStore } from "@/stores/device-store";
import { PercentSliderCard } from "./percent-slider-card";

/** capability: brightness — 調光ライトの絶対値スライダー（0-100）。 */
export function BrightnessCard({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setBrightness = useDeviceStore((s) => s.setBrightness);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));

  return (
    <PercentSliderCard
      label={t("brightness")}
      value={device.controls.brightness ?? 0}
      disabled={offline}
      onChange={(v) => setBrightness(device.id, v)}
    />
  );
}
