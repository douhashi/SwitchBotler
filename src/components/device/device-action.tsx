import { useTranslation } from "react-i18next";
import { ChevronRight, Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type Device, deviceInteraction } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";

/**
 * デバイス 1 台の操作系（`deviceInteraction()` の 3 分岐）。
 *
 * - toggle: Switch（電源のみのデバイス）
 * - press: 「押す」ボタン（pressMode の Bot。momentary）
 * - detail: 「>」で詳細画面へ
 *
 * 一覧のカードとお気に入り行の両方から使う（分岐ロジックを 1 箇所に集約する）。
 */
export function DeviceAction({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setPower = useDeviceStore((s) => s.setPower);
  const press = useDeviceStore((s) => s.press);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const navigate = useNavigationStore((s) => s.navigate);

  const interaction = deviceInteraction(device);
  const on = device.controls.power;

  if (interaction === "detail") {
    return (
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
    );
  }

  if (interaction === "toggle") {
    return (
      <Switch
        checked={on}
        disabled={offline}
        aria-disabled={offline || undefined}
        onCheckedChange={(checked) => setPower(device.id, checked)}
        aria-label={device.name}
        className={cn(offline && "pointer-events-none")}
      />
    );
  }

  if (interaction === "press") {
    return (
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
    );
  }

  return null;
}
