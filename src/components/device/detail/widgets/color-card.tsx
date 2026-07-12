import { useTranslation } from "react-i18next";

import { type Device } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";

/** capability: color — カラー電球のスウォッチ選択。 */
export function ColorCard({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setColor = useDeviceStore((s) => s.setColor);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const { colorId } = device.controls;

  if (!device.colorOptions) return null;

  return (
    <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
      <div className="mb-3.5 text-[12.5px] text-muted-foreground">{t("color")}</div>
      <div role="radiogroup" aria-label={t("color")} className="flex gap-2.5">
        {device.colorOptions.map((color) => {
          const selected = color.id === colorId;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t(`colorName.${color.id}`)}
              disabled={offline}
              aria-disabled={offline || undefined}
              onClick={() => setColor(device.id, color.id)}
              style={{ background: color.swatch }}
              className={cn(
                "size-[30px] rounded-full shadow-raise-sm",
                selected &&
                  "ring-2 ring-sd-accent ring-offset-2 ring-offset-background",
                offline && "pointer-events-none opacity-50",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
