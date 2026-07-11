import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ViewHeader } from "@/components/view-header";
import { type Device, deviceStatusLabel, hasPowerToggle } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { DeviceIcon } from "./device-icon";

/** hero に出す説明行を制御値から組み立てる。 */
function heroDetail(device: Device): string {
  const { brightness, position, colorId } = device.controls;
  if (brightness !== undefined) {
    const color = device.colorOptions?.find((c) => c.id === colorId);
    return color ? `明るさ ${brightness}% · ${color.label}` : `明るさ ${brightness}%`;
  }
  if (position !== undefined) return `開度 ${position}%`;
  return device.model;
}

/** 個別デバイスの詳細操作（mockup 02）。 */
export function DeviceDetail({ device }: { device: Device }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const toggle = useDeviceStore((s) => s.toggle);
  const updateControl = useDeviceStore((s) => s.updateControl);

  const { power, brightness, position, colorId } = device.controls;

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
    </div>
  );
}
