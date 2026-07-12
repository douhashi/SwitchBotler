import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AIRCON_MODE_ICON } from "@/components/device/device-icon";
import { DETAIL_WIDGETS } from "@/components/device/detail/registry";
import {
  AIRCON_FANS,
  AIRCON_MODES,
  MODE_ACCENT_VAR,
} from "@/components/device/detail/widgets/aircon-controls";
import { PowerToggle } from "@/components/device/detail/widgets/power-toggle";
import { Slider } from "@/components/ui/slider";
import {
  AIRCON_TEMP_MAX,
  AIRCON_TEMP_MIN,
  airconFanLabel,
  airconModeLabel,
  deviceCapabilities,
  type Device,
} from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";

/** 温度の −/＋ ステッパー（tray コンパクト。main の 44px → 36px）。 */
function TrayStep({
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
        "grid size-9 shrink-0 place-items-center rounded-[12px] text-[var(--m)] shadow-raise-sm active:shadow-inset-sm",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

/**
 * トレイ popup 内のエアコン操作（compact）。mockup tray 03 に対応。
 *
 * ロジック（モード/風量順・モード色・温度クランプ）はメイン {@link AirconControls} と共有し
 * （constants を import）、レイアウトのみ popup 向けにコンパクト化する（hero 74→46px 等）。
 * モードチップは出さない（下のモードグリッド＋数値の色で自明。決定 B）。
 */
function TrayAircon({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setClimate = useDeviceStore((s) => s.setClimate);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const { temperature, mode, fanSpeed } = device.controls;

  const activeMode = mode ?? "cool";
  const accent = MODE_ACCENT_VAR[activeMode];
  const FanAutoIcon = AIRCON_MODE_ICON.auto;
  const currentTemp = temperature ?? 26;
  const tempDisabled = offline || activeMode === "fan";

  const stepTemp = (delta: number) => {
    const next = Math.min(
      AIRCON_TEMP_MAX,
      Math.max(AIRCON_TEMP_MIN, currentTemp + delta),
    );
    setClimate(device.id, { temperature: next });
  };

  return (
    <div
      style={{ "--m": accent } as CSSProperties}
      className="rounded-[14px] bg-card p-3.5 shadow-raise"
    >
      {/* ヒーロー温度（46px）。数値=mono/tabular・単位=sans。送風は「—」。 */}
      <div className="pt-1 pb-0.5">
        <div className="flex items-baseline justify-center">
          {activeMode === "fan" ? (
            <span className="font-mono text-[46px] leading-none font-bold tracking-tight text-muted-foreground">
              —
            </span>
          ) : (
            <>
              <span className="font-mono text-[46px] leading-none font-bold tracking-tight tabular-nums text-[var(--m)]">
                {currentTemp}
              </span>
              <span className="ml-1 text-[18px] font-semibold text-muted-foreground">
                ℃
              </span>
            </>
          )}
        </div>
      </div>

      {/* 温度: −/＋ とスライダーを同じ行で中央揃え、スケールは別行（スライダー幅へ内寄せ）。 */}
      <div className="mt-2 flex items-center gap-2.5">
        <TrayStep
          label={t("tempDown")}
          disabled={tempDisabled}
          onClick={() => stepTemp(-1)}
        >
          <Minus size={18} strokeWidth={2.2} aria-hidden />
        </TrayStep>
        <div className="flex-1">
          <Slider
            value={[currentTemp]}
            min={AIRCON_TEMP_MIN}
            max={AIRCON_TEMP_MAX}
            disabled={tempDisabled}
            rangeClassName="bg-[var(--m)]"
            aria-label={t("temperature")}
            onValueChange={([v]) => setClimate(device.id, { temperature: v })}
          />
        </div>
        <TrayStep
          label={t("tempUp")}
          disabled={tempDisabled}
          onClick={() => stepTemp(1)}
        >
          <Plus size={18} strokeWidth={2.2} aria-hidden />
        </TrayStep>
      </div>
      <div className="mt-1.5 flex justify-between px-[46px] text-[10.5px] text-muted-foreground">
        <span>{t("tempScaleMin")}</span>
        <span>{t("tempScaleMax")}</span>
      </div>

      {/* 運転モード */}
      <div className="mt-3.5 mb-1.5 px-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {t("mode")}
      </div>
      <div role="radiogroup" aria-label={t("mode")} className="grid grid-cols-5 gap-1.5">
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
              onClick={() => setClimate(device.id, { mode: m })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[11px] px-0.5 py-2 transition-shadow",
                selected
                  ? "text-[var(--m)] shadow-raise-sm"
                  : "text-muted-foreground shadow-inset-sm hover:text-foreground",
                offline && "pointer-events-none opacity-50",
              )}
            >
              <Icon size={17} strokeWidth={1.75} aria-hidden />
              <span className="text-[10px] font-semibold">
                {airconModeLabel(m, t)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 風量 */}
      <div className="mt-3.5 mb-1.5 px-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {t("fan")}
      </div>
      <div
        role="radiogroup"
        aria-label={t("fan")}
        className="grid grid-cols-4 gap-1 rounded-[12px] p-1 shadow-inset"
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
              onClick={() => setClimate(device.id, { fanSpeed: f })}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-[9px] px-0.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                selected
                  ? "bg-background text-[var(--m)] shadow-raise-sm"
                  : "text-muted-foreground hover:text-foreground",
                offline && "pointer-events-none opacity-50",
              )}
            >
              {f === "auto" && <FanAutoIcon size={13} strokeWidth={2} aria-hidden />}
              {airconFanLabel(f, t)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * トレイ popup 内のデバイス詳細（ドリルイン）。「>」から main を開かず popup 内で完結する。
 *
 * capability 駆動: エアコンだけ compact 版 {@link TrayAircon} を使い、その他（明るさ/カラー/
 * 開度/相対明暗）はメインの capability widget を流用する（DRY）。要約（statusHero）はヘッダの
 * 名前＋モデルと重複するため詳細では出さない。電源は power capability を持つ型のみヘッダへ。
 */
export function TrayDeviceDetail({
  device,
  onBack,
}: {
  device: Device;
  onBack: () => void;
}) {
  const { t } = useTranslation("common");
  const capabilities = deviceCapabilities(device);
  const hasPower = capabilities.some((c) => c.kind === "power");
  const bodyCapabilities = capabilities.filter(
    (c) => c.kind !== "power" && c.kind !== "statusHero",
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("actions.back")}
          className="grid size-8 shrink-0 place-items-center rounded-[10px] text-muted-foreground shadow-raise-sm transition-colors hover:text-foreground active:shadow-inset-sm"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold">{device.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {device.model}
          </div>
        </div>
        {hasPower && <PowerToggle device={device} size="default" />}
      </div>

      {/* エアコンは compact 版、その他はメイン widget を流用（自前で mb-3 を持つ）。 */}
      {bodyCapabilities.map((capability) => {
        if (capability.kind === "climate") {
          return <TrayAircon key={capability.kind} device={device} />;
        }
        const Widget = DETAIL_WIDGETS[capability.kind];
        return <Widget key={capability.kind} device={device} />;
      })}
    </div>
  );
}
