import { useTranslation } from "react-i18next";

import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ViewHeader } from "@/components/view-header";
import {
  AIRCON_TEMP_MAX,
  AIRCON_TEMP_MIN,
  type AirconFanSpeed,
  airconFanLabel,
  type AirconMode,
  airconModeLabel,
  type Device,
  deviceStatusLabel,
  hasPowerToggle,
  type IrLightAction,
  type Translate,
} from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceIcon } from "./device-icon";

const AIRCON_MODES: AirconMode[] = ["auto", "cool", "dry", "fan", "heat"];
const AIRCON_FANS: AirconFanSpeed[] = ["auto", "low", "medium", "high"];

/** 赤外線ライトの相対明暗ボタン（絶対値・状態を持たない送信専用アクション）。 */
const IR_LIGHT_BRIGHTNESS_ACTIONS: { action: IrLightAction; labelKey: string }[] = [
  { action: "brighter", labelKey: "brighter" },
  { action: "dimmer", labelKey: "dimmer" },
];

/** hero に出す説明行を制御値から組み立てる（`devices` namespace の翻訳関数を渡す）。 */
function heroDetail(device: Device, t: Translate): string {
  const { brightness, position, colorId, mode, fanSpeed } = device.controls;
  if (device.category === "aircon") {
    if (mode === undefined || fanSpeed === undefined) return device.model;
    return t("hero.aircon", {
      mode: airconModeLabel(mode, t),
      fan: airconFanLabel(fanSpeed, t),
    });
  }
  if (brightness !== undefined) {
    const color = device.colorOptions?.find((c) => c.id === colorId);
    return color
      ? t("hero.brightnessColor", {
          brightness,
          color: t(`colorName.${color.id}`),
        })
      : t("hero.brightness", { brightness });
  }
  if (position !== undefined) return t("hero.position", { position });
  return device.model;
}

/** 汎用セグメントコントロール（モード・風量選択に使う）。 */
function Segmented<T extends string>({
  label,
  options,
  value,
  labelOf,
  onSelect,
  disabled = false,
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  labelOf: (v: T) => string;
  onSelect: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
      <div className="mb-3 text-[12.5px] text-muted-foreground">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              aria-disabled={disabled || undefined}
              onClick={() => onSelect(option)}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-xs font-semibold transition-colors",
                selected
                  ? "bg-background text-sd-accent shadow-raise-sm"
                  : "text-muted-foreground shadow-inset-sm hover:text-foreground",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {labelOf(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 個別デバイスの詳細操作（mockup 02）。 */
export function DeviceDetail({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const navigate = useNavigationStore((s) => s.navigate);
  const toggle = useDeviceStore((s) => s.toggle);
  const updateControl = useDeviceStore((s) => s.updateControl);
  const operateIrLight = useDeviceStore((s) => s.operateIrLight);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));

  const { power, brightness, position, colorId, temperature, mode, fanSpeed } =
    device.controls;
  const isAircon = device.category === "aircon";
  const isIrLight = device.category === "ir_light";

  return (
    <div>
      <ViewHeader
        title={device.name}
        subtitle={device.model}
        onBack={() => navigate("devices")}
        actions={
          hasPowerToggle(device) ? (
            <Switch
              checked={power}
              disabled={offline}
              aria-disabled={offline || undefined}
              onCheckedChange={() => toggle(device.id)}
              aria-label={t("power")}
              className={cn(offline && "pointer-events-none")}
            />
          ) : undefined
        }
      />

      <div className="mb-4 flex items-center gap-4 rounded-[18px] bg-card p-[18px] shadow-raise">
        <span
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-2xl shadow-raise-sm",
            power ? "text-sd-accent" : "text-muted-foreground",
          )}
        >
          <DeviceIcon category={device.category} size={28} strokeWidth={1.6} />
        </span>
        <div>
          <div className="text-[17px] font-bold">{deviceStatusLabel(device, t)}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {heroDetail(device, t)}
            {/* 一覧と同じく理由を色だけに頼らず常時可読にする（インライン併記）。 */}
            {offline && <span className="text-sd-warn"> · {t("offline")}</span>}
          </div>
        </div>
      </div>

      {brightness !== undefined && (
        <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
          <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted-foreground">
            <span>{t("brightness")}</span>
            <b className="font-mono font-semibold text-foreground">
              {brightness}%
            </b>
          </div>
          <Slider
            value={[brightness]}
            min={0}
            max={100}
            disabled={offline}
            aria-label={t("brightness")}
            onValueChange={([v]) => updateControl(device.id, { brightness: v })}
          />
        </div>
      )}

      {device.colorOptions && (
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
                  onClick={() => updateControl(device.id, { colorId: color.id })}
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
      )}

      {position !== undefined && (
        <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
          <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted-foreground">
            <span>{t("position")}</span>
            <b className="font-mono font-semibold text-foreground">{position}%</b>
          </div>
          <Slider
            value={[position]}
            min={0}
            max={100}
            disabled={offline}
            aria-label={t("position")}
            onValueChange={([v]) => updateControl(device.id, { position: v })}
          />
        </div>
      )}

      {isAircon && (
        <>
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-card p-4 shadow-raise">
            <span className="text-[12.5px] text-muted-foreground">{t("power")}</span>
            <Switch
              checked={power}
              disabled={offline}
              aria-disabled={offline || undefined}
              onCheckedChange={() => updateControl(device.id, { power: !power })}
              aria-label={t("power")}
              className={cn(offline && "pointer-events-none")}
            />
          </div>

          {temperature !== undefined && (
            <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
              <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span>{t("temperature")}</span>
                <b className="font-mono font-semibold text-foreground">{temperature}℃</b>
              </div>
              <Slider
                value={[temperature]}
                min={AIRCON_TEMP_MIN}
                max={AIRCON_TEMP_MAX}
                disabled={offline}
                aria-label={t("temperature")}
                onValueChange={([v]) => updateControl(device.id, { temperature: v })}
              />
            </div>
          )}

          <Segmented
            label={t("mode")}
            options={AIRCON_MODES}
            value={mode}
            labelOf={(v) => airconModeLabel(v, t)}
            disabled={offline}
            onSelect={(v) => updateControl(device.id, { mode: v })}
          />

          <Segmented
            label={t("fan")}
            options={AIRCON_FANS}
            value={fanSpeed}
            labelOf={(v) => airconFanLabel(v, t)}
            disabled={offline}
            onSelect={(v) => updateControl(device.id, { fanSpeed: v })}
          />
        </>
      )}

      {isIrLight && (
        <>
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-card p-4 shadow-raise">
            <span className="text-[12.5px] text-muted-foreground">{t("power")}</span>
            <Switch
              checked={power}
              disabled={offline}
              aria-disabled={offline || undefined}
              onCheckedChange={() => operateIrLight(device.id, power ? "off" : "on")}
              aria-label={t("power")}
              className={cn(offline && "pointer-events-none")}
            />
          </div>

          <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
            <div className="mb-3 text-[12.5px] text-muted-foreground">{t("brightness")}</div>
            {/* 赤外線ライトは絶対値を持たず相対コマンドのみ。状態を持たない送信専用アクション。 */}
            <div className="flex gap-1.5">
              {IR_LIGHT_BRIGHTNESS_ACTIONS.map(({ action, labelKey }) => (
                <button
                  key={action}
                  type="button"
                  disabled={offline}
                  aria-disabled={offline || undefined}
                  onClick={() => operateIrLight(device.id, action)}
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
        </>
      )}
    </div>
  );
}
