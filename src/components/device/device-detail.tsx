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
} from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceIcon } from "./device-icon";

const AIRCON_MODES: AirconMode[] = ["auto", "cool", "dry", "fan", "heat"];
const AIRCON_FANS: AirconFanSpeed[] = ["auto", "low", "medium", "high"];

/** hero に出す説明行を制御値から組み立てる。 */
function heroDetail(device: Device): string {
  const { brightness, position, colorId, mode, fanSpeed } = device.controls;
  if (device.category === "aircon") {
    if (mode === undefined || fanSpeed === undefined) return device.model;
    return `${airconModeLabel(mode)} · 風量${airconFanLabel(fanSpeed)}`;
  }
  if (brightness !== undefined) {
    const color = device.colorOptions?.find((c) => c.id === colorId);
    return color ? `明るさ ${brightness}% · ${color.label}` : `明るさ ${brightness}%`;
  }
  if (position !== undefined) return `開度 ${position}%`;
  return device.model;
}

/** 汎用セグメントコントロール（モード・風量選択に使う）。 */
function Segmented<T extends string>({
  label,
  options,
  value,
  labelOf,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  labelOf: (v: T) => string;
  onSelect: (v: T) => void;
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
              onClick={() => onSelect(option)}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-xs font-semibold transition-colors",
                selected
                  ? "bg-background text-sd-accent shadow-raise-sm"
                  : "text-muted-foreground shadow-inset-sm hover:text-foreground",
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
  const navigate = useNavigationStore((s) => s.navigate);
  const toggle = useDeviceStore((s) => s.toggle);
  const updateControl = useDeviceStore((s) => s.updateControl);

  const { power, brightness, position, colorId, temperature, mode, fanSpeed } =
    device.controls;
  const isAircon = device.category === "aircon";

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
              onCheckedChange={() => toggle(device.id)}
              aria-label="電源"
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
          <div className="text-[17px] font-bold">{deviceStatusLabel(device)}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {heroDetail(device)}
          </div>
        </div>
      </div>

      {brightness !== undefined && (
        <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
          <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted-foreground">
            <span>明るさ</span>
            <b className="font-mono font-semibold text-foreground">
              {brightness}%
            </b>
          </div>
          <Slider
            value={[brightness]}
            min={0}
            max={100}
            aria-label="明るさ"
            onValueChange={([v]) => updateControl(device.id, { brightness: v })}
          />
        </div>
      )}

      {device.colorOptions && (
        <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
          <div className="mb-3.5 text-[12.5px] text-muted-foreground">カラー</div>
          <div role="radiogroup" aria-label="カラー" className="flex gap-2.5">
            {device.colorOptions.map((color) => {
              const selected = color.id === colorId;
              return (
                <button
                  key={color.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={color.label}
                  onClick={() => updateControl(device.id, { colorId: color.id })}
                  style={{ background: color.swatch }}
                  className={cn(
                    "size-[30px] rounded-full shadow-raise-sm",
                    selected &&
                      "ring-2 ring-sd-accent ring-offset-2 ring-offset-background",
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
            <span>開度</span>
            <b className="font-mono font-semibold text-foreground">{position}%</b>
          </div>
          <Slider
            value={[position]}
            min={0}
            max={100}
            aria-label="開度"
            onValueChange={([v]) => updateControl(device.id, { position: v })}
          />
        </div>
      )}

      {isAircon && (
        <>
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-card p-4 shadow-raise">
            <span className="text-[12.5px] text-muted-foreground">電源</span>
            <Switch
              checked={power}
              onCheckedChange={() => updateControl(device.id, { power: !power })}
              aria-label="電源"
            />
          </div>

          {temperature !== undefined && (
            <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
              <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span>温度</span>
                <b className="font-mono font-semibold text-foreground">{temperature}℃</b>
              </div>
              <Slider
                value={[temperature]}
                min={AIRCON_TEMP_MIN}
                max={AIRCON_TEMP_MAX}
                aria-label="温度"
                onValueChange={([v]) => updateControl(device.id, { temperature: v })}
              />
            </div>
          )}

          <Segmented
            label="モード"
            options={AIRCON_MODES}
            value={mode}
            labelOf={airconModeLabel}
            onSelect={(v) => updateControl(device.id, { mode: v })}
          />

          <Segmented
            label="風量"
            options={AIRCON_FANS}
            value={fanSpeed}
            labelOf={airconFanLabel}
            onSelect={(v) => updateControl(device.id, { fanSpeed: v })}
          />
        </>
      )}
    </div>
  );
}
