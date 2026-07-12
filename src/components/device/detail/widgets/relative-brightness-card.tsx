import { useTranslation } from "react-i18next";

import { type Device } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";

/** 相対明暗の送信専用アクション（絶対値・状態を持たない）。 */
const NUDGE_ACTIONS = [
  { direction: "brighter", labelKey: "brighter" },
  { direction: "dimmer", labelKey: "dimmer" },
] as const;

/** capability: brightnessRelative — 赤外線ライトの明暗ボタン（brighter/dimmer）。 */
export function RelativeBrightnessCard({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const nudgeBrightness = useDeviceStore((s) => s.nudgeBrightness);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));

  return (
    <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
      <div className="mb-3 text-[12.5px] text-muted-foreground">{t("brightness")}</div>
      {/* 赤外線ライトは絶対値を持たず相対コマンドのみ。状態を持たない送信専用アクション。 */}
      <div className="flex gap-1.5">
        {NUDGE_ACTIONS.map(({ direction, labelKey }) => (
          <button
            key={direction}
            type="button"
            disabled={offline}
            aria-disabled={offline || undefined}
            onClick={() => nudgeBrightness(device.id, direction)}
            className={cn(
              "flex-1 rounded-[10px] px-3.5 py-2 text-xs font-semibold text-muted-foreground shadow-inset-sm transition-colors hover:text-foreground",
              offline && "pointer-events-none opacity-50",
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
