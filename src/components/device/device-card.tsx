import { useTranslation } from "react-i18next";
import { Pin } from "lucide-react";

import { type Device, deviceStatusLabel } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { DeviceAction } from "./device-action";
import { DeviceIcon } from "./device-icon";

/** デバイス 1 台のカード（mockup .device）。toggle 型は Switch、detail 型は chevron。 */
export function DeviceCard({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const favorite = useFavoritesStore((s) => s.deviceIds.includes(device.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleDeviceFavorite);

  const on = device.controls.power;
  // オフライン時はアイコンを常に muted + inset にし、電源色を出さない。
  const iconActive = on && !offline;

  return (
    <div
      aria-disabled={offline || undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-raise",
        !on && "text-muted-foreground",
        offline && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          iconActive
            ? "text-sd-accent shadow-raise-sm"
            : "text-muted-foreground shadow-inset-sm",
        )}
      >
        <DeviceIcon category={device.category} size={20} strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {device.name}
        </div>
        {/* オフライン時は状態ラベルを「オフライン」に差し替え（モック index 01 = model · オフライン）。
            状態を積み増すと折り返してカードが間延びするため 1 行に収め、truncate でも保険をかける。
            色だけに頼らないよう warn 色のテキスト＋off-tag バッジを併記する。 */}
        <div
          className={cn(
            "mt-0.5 truncate text-[11.5px]",
            offline ? "text-sd-warn" : "text-muted-foreground",
          )}
        >
          {device.model} · {offline ? t("offline") : deviceStatusLabel(device, t)}
        </div>
      </div>

      <button
        type="button"
        aria-label={
          favorite
            ? t("favoriteRemove", { name: device.name })
            : t("favoriteAdd", { name: device.name })
        }
        aria-pressed={favorite}
        onClick={() => toggleFavorite(device.id)}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
          favorite
            ? "text-sd-accent shadow-inset-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Pin size={15} strokeWidth={2} className={cn(favorite && "fill-current")} />
      </button>

      {offline && (
        <span className="shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-semibold text-muted-foreground shadow-inset-sm">
          {t("offline")}
        </span>
      )}

      {/* 操作系（toggle / press / detail の 3 分岐）はお気に入り行と共通化する。 */}
      <DeviceAction device={device} />
    </div>
  );
}
