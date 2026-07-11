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
  const toggle = useDeviceStore((s) => s.toggle);
  const press = useDeviceStore((s) => s.press);
  const navigate = useNavigationStore((s) => s.navigate);
  const favorite = useFavoritesStore((s) => s.deviceIds.has(device.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleDeviceFavorite);

  const interaction = deviceInteraction(device);
  const on = device.controls.power;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-raise",
        !on && "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          on
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
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
          {device.model} · {deviceStatusLabel(device)}
        </div>
      </div>

      <button
        type="button"
        aria-label={
          favorite ? `${device.name} のお気に入りを解除` : `${device.name} をお気に入り`
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

      {interaction === "detail" && (
        <button
          type="button"
          aria-label={`${device.name} の詳細`}
          onClick={() => navigate("devices", device.id)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}
      {interaction === "toggle" && (
        <Switch
          checked={on}
          onCheckedChange={() => toggle(device.id)}
          aria-label={device.name}
        />
      )}
      {interaction === "press" && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={`${device.name} を押す`}
          onClick={() => press(device.id)}
          className="text-foreground"
        >
          <Hand size={15} strokeWidth={2} />
          押す
        </Button>
      )}
    </div>
  );
}
