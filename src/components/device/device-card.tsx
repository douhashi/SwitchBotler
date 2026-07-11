import { useTranslation } from "react-i18next";
import { ChevronRight, Hand, Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type Device, deviceInteraction, deviceStatusLabel } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceIcon } from "./device-icon";

/** デバイス 1 台のカード（mockup .device）。toggle 型は Switch、detail 型は chevron。 */
export function DeviceCard({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const toggle = useDeviceStore((s) => s.toggle);
  const press = useDeviceStore((s) => s.press);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const navigate = useNavigationStore((s) => s.navigate);
  const favorite = useFavoritesStore((s) => s.deviceIds.has(device.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleDeviceFavorite);

  const interaction = deviceInteraction(device);
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
        {/* オフライン時は理由を色だけに頼らず「· オフライン」を併記し、行を warn 色にする。 */}
        <div
          className={cn(
            "mt-0.5 text-[11.5px]",
            offline ? "text-sd-warn" : "text-muted-foreground",
          )}
        >
          {device.model} · {deviceStatusLabel(device, t)}
          {offline && ` · ${t("offline")}`}
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

      {interaction === "detail" && (
        <button
          type="button"
          aria-label={t("detailAria", { name: device.name })}
          aria-disabled={offline || undefined}
          onClick={() => navigate("devices", device.id)}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
            offline && "pointer-events-none",
          )}
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}
      {interaction === "toggle" && (
        <Switch
          checked={on}
          disabled={offline}
          aria-disabled={offline || undefined}
          onCheckedChange={() => toggle(device.id)}
          aria-label={device.name}
          className={cn(offline && "pointer-events-none")}
        />
      )}
      {interaction === "press" && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={t("pressAria", { name: device.name })}
          disabled={offline}
          aria-disabled={offline || undefined}
          onClick={() => press(device.id)}
          className={cn("text-foreground", offline && "pointer-events-none")}
        >
          <Hand size={15} strokeWidth={2} />
          {t("press")}
        </Button>
      )}
    </div>
  );
}
