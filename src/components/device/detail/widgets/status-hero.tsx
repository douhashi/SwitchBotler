import { useTranslation } from "react-i18next";

import { DeviceIcon } from "@/components/device/device-icon";
import { type Device, deviceStatusLabel, type Translate } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";

/** hero に出す説明行を制御値から組み立てる（`devices` namespace の翻訳関数を渡す）。 */
function heroDetail(device: Device, t: Translate): string {
  const { brightness, position, colorId } = device.controls;
  if (brightness !== undefined) {
    const color = device.colorOptions?.find((c) => c.id === colorId);
    return color
      ? t("hero.brightnessColor", {
          brightness,
          color: t(`colorName.${color.id}`),
        })
      : t("hero.brightness", { brightness });
  }
  if (position !== undefined) return t("hero.position", { position });
  return device.model;
}

/** capability: statusHero — アイコン＋状態ラベル＋説明の要約カード。 */
export function StatusHero({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const power = device.controls.power;

  return (
    <div className="mb-4 flex items-center gap-4 rounded-[18px] bg-card p-[18px] shadow-raise">
      <span
        className={cn(
          "grid size-14 shrink-0 place-items-center rounded-2xl shadow-raise-sm",
          power ? "text-sd-accent" : "text-muted-foreground",
        )}
      >
        <DeviceIcon category={device.category} size={28} strokeWidth={1.6} />
      </span>
      <div>
        <div className="text-[17px] font-bold">{deviceStatusLabel(device, t)}</div>
        <div className="mt-0.5 text-[12.5px] text-muted-foreground">
          {heroDetail(device, t)}
          {/* 一覧と同じく理由を色だけに頼らず常時可読にする（インライン併記）。 */}
          {offline && <span className="text-sd-warn"> · {t("offline")}</span>}
        </div>
      </div>
    </div>
  );
}
