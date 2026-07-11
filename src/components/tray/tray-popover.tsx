import type { ReactNode } from "react";
import { Layers, Zap } from "lucide-react";

import { DeviceIcon } from "@/components/device/device-icon";
import { Switch } from "@/components/ui/switch";
import { hasPowerToggle, useScenes } from "@/data";
import { cn } from "@/lib/utils";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";

/** フッタのテキストリンク（ウィンドウ / 設定 / 終了 で共通）。 */
function FootLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-[9px] py-2 text-center text-[11.5px] text-muted-foreground transition-colors hover:text-foreground active:shadow-inset-sm"
    >
      {children}
    </button>
  );
}

/** トレイのポップオーバー本体（mockup 06）。UI のみ（実 Tauri トレイ結線は #10）。 */
export function TrayPopover({ onClose }: { onClose: () => void }) {
  const devices = useDeviceStore((s) => s.devices);
  const toggle = useDeviceStore((s) => s.toggle);
  const connection = useConnectionStore((s) => s.connection);
  const navigate = useNavigationStore((s) => s.navigate);
  const { data: scenes } = useScenes();

  const connected = connection.status === "connected";
  // クイックトグルは電源操作できるデバイスに限る（未対応・カーテンは除外）。
  const quickDevices = devices.filter(hasPowerToggle).slice(0, 3);
  const quickScenes = (scenes ?? []).slice(0, 2);

  return (
    <div className="w-[278px]">
      <div className="flex items-center justify-between px-1.5 pb-3">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <span className="grid size-[22px] place-items-center rounded-[7px] bg-card text-sd-accent shadow-raise-sm">
            <Zap size={13} strokeWidth={1.9} />
          </span>
          SwitchBotler
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-sd-ok" : "bg-muted-foreground",
            )}
            style={connected ? { boxShadow: "0 0 6px var(--sd-ok)" } : undefined}
          />
          {connected ? "接続済み" : "未接続"}
        </span>
      </div>

      {quickDevices.map((device) => {
        const on = device.controls.power;
        return (
          <div
            key={device.id}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2.5"
          >
            <span
              className={cn(
                "grid size-[30px] shrink-0 place-items-center rounded-[9px]",
                on
                  ? "text-sd-accent shadow-raise-sm"
                  : "text-muted-foreground shadow-inset-sm",
              )}
            >
              <DeviceIcon category={device.category} size={16} strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-[13px] font-medium">{device.name}</span>
            <Switch
              size="sm"
              checked={on}
              onCheckedChange={() => toggle(device.id)}
              aria-label={device.name}
            />
          </div>
        );
      })}

      <div className="my-2 h-px bg-border" />

      <div className="flex gap-2 px-1 pb-2">
        {quickScenes.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => navigate("scenes")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[11.5px] font-semibold shadow-raise-sm active:shadow-inset-sm"
          >
            <Layers size={13} strokeWidth={1.9} className="text-sd-accent" />
            {scene.name}
          </button>
        ))}
      </div>

      <div className="my-2 h-px bg-border" />

      <div className="flex gap-2">
        <FootLink onClick={onClose}>ウィンドウを開く</FootLink>
        <FootLink
          onClick={() => {
            navigate("settings");
            onClose();
          }}
        >
          設定
        </FootLink>
        <FootLink onClick={onClose}>終了</FootLink>
      </div>
    </div>
  );
}
