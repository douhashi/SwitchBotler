import type { CSSProperties, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
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
import { AIRCON_MODE_ICON, DeviceIcon } from "./device-icon";

const AIRCON_MODES: AirconMode[] = ["auto", "cool", "dry", "fan", "heat"];
const AIRCON_FANS: AirconFanSpeed[] = ["auto", "low", "medium", "high"];

/** 運転モード → アクセント色 CSS 変数。fill・大数値・チップ・選択状態を 1 マップで連動させる。 */
const MODE_ACCENT_VAR: Record<AirconMode, string> = {
  auto: "var(--m-auto)",
  cool: "var(--m-cool)",
  dry: "var(--m-dry)",
  fan: "var(--m-fan)",
  heat: "var(--m-heat)",
};

/** 温度の −/＋ ステッパー（Soft Depth の凸ボタン。押下で凹に沈む）。 */
function TempStepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-[15px] text-[var(--m)] shadow-raise active:shadow-inset",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

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

/**
 * エアコン操作（mockup detail 01/02）。ヒーロー温度＋Soft Depth スライダー＋−/＋ステッパー、
 * アイコン付きモード/風量選択。運転モードのアクセント色（`--m`）を fill・大数値・チップ・
 * 選択状態へ一括連動させる。送風モードは温度指定不可のため温度操作を無効化し「—」表示にする。
 */
function AirconControls({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const updateControl = useDeviceStore((s) => s.updateControl);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const { temperature, mode, fanSpeed } = device.controls;

  // モード未確定時は cool を既定色にする（view-model 上は常に設定済み）。
  const activeMode = mode ?? "cool";
  const accent = MODE_ACCENT_VAR[activeMode];
  const ModeIcon = AIRCON_MODE_ICON[activeMode];
  const FanAutoIcon = AIRCON_MODE_ICON.auto;
  const currentTemp = temperature ?? 26;
  // 送風は多くの機種で温度指定不可。温度値はデータ・API 上は保持し、表示・操作のみ無効化する。
  const tempDisabled = offline || activeMode === "fan";

  const stepTemp = (delta: number) => {
    const next = Math.min(
      AIRCON_TEMP_MAX,
      Math.max(AIRCON_TEMP_MIN, currentTemp + delta),
    );
    updateControl(device.id, { temperature: next });
  };

  return (
    <div style={{ "--m": accent } as CSSProperties}>
      {/* mockup detail 01: ヒーロー温度＋温度操作＋モード＋風量を 1 枚のパネルに集約する
          （電源はヘッダのトグルへ集約し、要約カードはエアコンでは描かない）。 */}
      <div className="rounded-2xl bg-card p-4 shadow-raise">
        {/* ヒーロー温度：モードチップ＋大数値。送風時は数値・単位を muted の「—」にする。 */}
        <div className="pt-1.5 pb-1 text-center">
          <span
            className={cn(
              "mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-inset-sm",
              tempDisabled ? "text-muted-foreground" : "text-[var(--m)]",
            )}
          >
            <ModeIcon size={20} strokeWidth={1.75} aria-hidden />
            {airconModeLabel(activeMode, t)}
          </span>
          <div className="font-mono text-[74px] leading-[0.96] font-bold tracking-tight tabular-nums">
            {activeMode === "fan" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className="text-[var(--m)]">{currentTemp}</span>
            )}
            <span className="ml-0.5 text-[30px] font-semibold text-muted-foreground">
              ℃
            </span>
          </div>
        </div>

        {/* 温度行：−/＋ ステッパー（Soft Depth）＋モード色 fill のスライダー＋スケール表記。 */}
        <div className="mt-3 flex items-center gap-3.5">
          <TempStepButton
            label={t("tempDown")}
            disabled={tempDisabled}
            onClick={() => stepTemp(-1)}
          >
            <Minus size={22} strokeWidth={2.2} aria-hidden />
          </TempStepButton>
          <div className="flex-1">
            <Slider
              value={[currentTemp]}
              min={AIRCON_TEMP_MIN}
              max={AIRCON_TEMP_MAX}
              disabled={tempDisabled}
              rangeClassName="bg-[var(--m)]"
              aria-label={t("temperature")}
              onValueChange={([v]) => updateControl(device.id, { temperature: v })}
            />
            <div className="mt-2 flex justify-between font-mono text-[10.5px] text-muted-foreground">
              <span>{t("tempScaleMin")}</span>
              <span>{t("tempScaleMax")}</span>
            </div>
          </div>
          <TempStepButton
            label={t("tempUp")}
            disabled={tempDisabled}
            onClick={() => stepTemp(1)}
          >
            <Plus size={22} strokeWidth={2.2} aria-hidden />
          </TempStepButton>
        </div>

        {/* 運転モード：5 列のアイコン＋ラベル。選択で凸＋アクセント色、非選択は凹。 */}
        <div className="mt-5">
          <div className="mb-2.5 px-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("mode")}
          </div>
          <div role="radiogroup" aria-label={t("mode")} className="grid grid-cols-5 gap-2">
            {AIRCON_MODES.map((m) => {
              const Icon = AIRCON_MODE_ICON[m];
              const selected = m === activeMode;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={offline}
                  aria-disabled={offline || undefined}
                  onClick={() => updateControl(device.id, { mode: m })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-[14px] px-1 py-2.5 transition-shadow",
                    selected
                      ? "text-[var(--m)] shadow-raise-sm"
                      : "text-muted-foreground shadow-inset-sm hover:text-foreground",
                    offline && "pointer-events-none opacity-50",
                  )}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                  <span className="text-[10.5px] font-semibold">
                    {airconModeLabel(m, t)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 風量：セグメント。自動のみアイコン＋ラベル、弱/中/強はラベルのみ。 */}
        <div className="mt-5">
          <div className="mb-2.5 px-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("fan")}
          </div>
          <div
            role="radiogroup"
            aria-label={t("fan")}
            className="grid grid-cols-4 gap-1.5 rounded-[14px] p-1.5 shadow-inset"
          >
            {AIRCON_FANS.map((f) => {
              const selected = f === fanSpeed;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={offline}
                  aria-disabled={offline || undefined}
                  onClick={() => updateControl(device.id, { fanSpeed: f })}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-[10px] px-1 py-2 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-background text-[var(--m)] shadow-raise-sm"
                      : "text-muted-foreground hover:text-foreground",
                    offline && "pointer-events-none opacity-50",
                  )}
                >
                  {f === "auto" && <FanAutoIcon size={15} strokeWidth={2} aria-hidden />}
                  {airconFanLabel(f, t)}
                </button>
              );
            })}
          </div>
        </div>
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

  const { power, brightness, position, colorId } = device.controls;
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
          ) : isAircon ? (
            // エアコンは hasPowerToggle=false（setAll 送信）のため toggle ではなく
            // updateControl({ power }) で配線する。運転トグルはヘッダに集約する（mockup 01）。
            <Switch
              checked={power}
              disabled={offline}
              aria-disabled={offline || undefined}
              onCheckedChange={() => updateControl(device.id, { power: !power })}
              aria-label={t("power")}
              className={cn(offline && "pointer-events-none")}
            />
          ) : undefined
        }
      />

      {/* 要約カード（アイコン＋状態＋説明）。エアコンはヒーロー温度パネルが状態を兼ねるため
          出さない（mockup 01 = ヘッダ→即ヒーロー）。他種別では状態の一覧性のため残す。 */}
      {!isAircon && (
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
      )}

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

      {isAircon && <AirconControls device={device} />}

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
