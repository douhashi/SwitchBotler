import type { ComponentPropsWithRef, HTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { type Device, deviceStatusLabel } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { DeviceAction } from "./device-action";
import { DeviceIcon } from "./device-icon";

/**
 * デバイス 1 台のカード（mockup .device）。お気に入り・その他の両セクションで使う。
 *
 * **ピン（お気に入りボタン）は持たない。** お気に入りは「セクション（ドロップ先）」であり、
 * 登録はカードを**ドラッグして移す**ことで行う（非ドラッグ経路はコンテキストメニュー）。
 * その結果、行の**コントロール枠には常にひとつ**——その機器の操作だけ——が入るので、
 * 幅の違う操作系（Switch / 「>」/ 「押す」）が並んで横位置がズレる問題が起きない。
 *
 * `control` を渡すと操作系の代わりにそれを描く（並び替えモードで ↑↓ に差し替えるため）。
 */
export function DeviceCard({
  device,
  control,
  dragProps,
  dragging,
  label,
  ...rest
}: {
  device: Device;
  /** 操作系の差し替え（並び替えモードの ↑↓ 等）。未指定なら {@link DeviceAction}。 */
  control?: ReactNode;
  /** ドラッグ用のハンドラ群（お気に入りの登録・並び替え・解除）。 */
  dragProps?: HTMLAttributes<HTMLElement> & {
    draggable?: boolean;
    "data-fav-id"?: string;
  };
  dragging?: boolean;
  /** 読み上げ用のラベル（お気に入りでは「N 件中 M 番目」を含める）。既定はデバイス名。 */
  label?: string;
} & ComponentPropsWithRef<"div">) {
  const { t } = useTranslation("devices");
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));

  const on = device.controls.power;
  // オフライン時はアイコンを常に muted + inset にし、電源色を出さない。
  const iconActive = on && !offline;

  return (
    <div
      role="listitem"
      aria-label={label ?? device.name}
      aria-disabled={offline || undefined}
      {...rest}
      {...dragProps}
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-raise transition-shadow",
        !on && "text-muted-foreground",
        offline && "cursor-not-allowed opacity-50",
        dragProps?.draggable && !offline && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-45 shadow-inset-sm",
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
            状態を積み増すと折り返してカードが間延びするため 1 行に収め、truncate でも保険をかける。 */}
        <div
          className={cn(
            "mt-0.5 truncate text-[11.5px]",
            offline ? "text-sd-warn" : "text-muted-foreground",
          )}
        >
          {device.model} · {offline ? t("offline") : deviceStatusLabel(device, t)}
        </div>
      </div>

      {/* コントロール枠は常にひとつ。通常は操作系、並び替え中は ↑↓ に入れ替わる。
          data-no-drag: この上からはドラッグを開始しない（押すつもりが掴む事故を防ぐ）。 */}
      <div data-no-drag className="flex shrink-0 items-center gap-2">
        {control ?? <DeviceAction device={device} />}
      </div>
    </div>
  );
}
