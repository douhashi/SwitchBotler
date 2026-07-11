import type { Device } from "@/data";
import { DeviceIcon } from "./device-icon";

/**
 * 「その他」デバイス（操作もセンサー読み取りもできないハブ類・操作未対応の
 * 赤外線リモコン等）の読み取り専用行。操作要素・ピン留め・バッジは持たず、
 * アイコン＋名前＋モデル名を muted 表示するだけの静的な行。
 */
export function OtherDeviceRow({ device }: { device: Device }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 text-muted-foreground shadow-inset-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground shadow-inset-sm">
        <DeviceIcon category={device.category} size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {device.name}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
          {device.model}
        </div>
      </div>
    </div>
  );
}
