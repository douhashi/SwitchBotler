import { useTranslation } from "react-i18next";

import { Switch } from "@/components/ui/switch";
import { type Device } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";

/**
 * capability: power — 電源トグル（詳細ヘッダに配置）。
 * 送信方法（汎用 / エアコン setAll / 赤外線 on-off）は store の `setPower` が吸収するため、
 * ここは on/off を渡すだけで category を意識しない。
 */
export function PowerToggle({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setPower = useDeviceStore((s) => s.setPower);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));

  return (
    <Switch
      size="lg"
      checked={device.controls.power}
      disabled={offline}
      aria-disabled={offline || undefined}
      onCheckedChange={(checked) => setPower(device.id, checked)}
      aria-label={t("power")}
      className={cn(offline && "pointer-events-none")}
    />
  );
}
