import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

import type { Device } from "@/data";
import { OtherDeviceRow } from "./other-device-row";

/**
 * 操作もセンサー読み取りもできない「その他」デバイスを集約する折りたたみセクション。
 * 既定は折りたたみ（展開状態は永続化しない）。対象が無ければ何も描画しない。
 */
export function OtherDevicesSection({ devices }: { devices: Device[] }) {
  const { t } = useTranslation("devices");
  const [open, setOpen] = useState(false);

  if (devices.length === 0) return null;

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      className="mt-5"
    >
      <CollapsiblePrimitive.Trigger className="flex w-full items-center gap-1.5 px-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
        {open ? (
          <ChevronDown size={14} strokeWidth={2.25} />
        ) : (
          <ChevronRight size={14} strokeWidth={2.25} />
        )}
        {t("otherSection")}
        <span className="font-normal">({devices.length})</span>
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="mt-2">
        <div className="grid gap-2">
          {devices.map((device) => (
            <OtherDeviceRow key={device.id} device={device} />
          ))}
        </div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
