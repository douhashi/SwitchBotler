import type { CSSProperties, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AIRCON_MODE_ICON } from "@/components/device/device-icon";
import { Slider } from "@/components/ui/slider";
import {
  AIRCON_TEMP_MAX,
  AIRCON_TEMP_MIN,
  type AirconFanSpeed,
  airconFanLabel,
  type AirconMode,
  airconModeLabel,
  type Device,
} from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";

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

/**
 * capability: climate — エアコン操作（mockup detail 01）。
 *
 * ヒーロー温度＋Soft Depth スライダー＋−/＋ステッパー、アイコン付きモード/風量選択を
 * 1 枚のパネルに集約する。運転モードのアクセント色（`--m`）を fill・大数値・チップ・
 * 選択状態へ一括連動。送風モードは温度指定不可のため温度操作を無効化し「—」表示にする。
 * 電源はヘッダの power capability へ集約したため本 widget は持たない。
 */
export function AirconControls({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const setClimate = useDeviceStore((s) => s.setClimate);
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
    setClimate(device.id, { temperature: next });
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
              onValueChange={([v]) => setClimate(device.id, { temperature: v })}
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
                  onClick={() => setClimate(device.id, { mode: m })}
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
                  onClick={() => setClimate(device.id, { fanSpeed: f })}
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
