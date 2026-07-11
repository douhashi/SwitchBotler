import { useTranslation } from "react-i18next";
import { Battery, Droplet, type LucideIcon, Radar, Sun, Thermometer } from "lucide-react";

import { BarMeter } from "@/components/charts/bar-meter";
import { cn } from "@/lib/utils";
import type { SensorIcon, SensorMetric } from "@/data";

const METRIC_ICON: Record<SensorIcon, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplet,
  battery: Battery,
  motion: Radar,
  brightness: Sun,
};

/**
 * センサー計測値カード（mockup .stat）。ラベル + 値表現。
 * - gauge（温度/湿度/電池）: 大数値 + メーター。
 * - state（人感/明るさ）: 区分テキスト（メーターなし）。tone で検知状態を強調する。
 * ラベル・区分テキストは Rust から受け取らず、`icon`・`state` キーから翻訳する（i18n）。
 * API は単一時点値のみを返すため履歴（スパークライン）は持たない（決定3）。
 */
export function StatCard({ metric }: { metric: SensorMetric }) {
  const { t } = useTranslation("sensors");
  const Icon = METRIC_ICON[metric.icon];
  const label = t(`metric.${metric.icon}`);

  return (
    <div className="rounded-[15px] bg-card px-[15px] py-3.5 shadow-raise">
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Icon size={14} strokeWidth={1.75} />
        {label}
      </div>

      {metric.kind === "gauge" ? (
        <>
          <div className="mt-[7px] font-mono text-[27px] leading-none font-semibold tracking-tight tabular-nums">
            {metric.value}
            <span className="ml-0.5 text-sm font-medium text-muted-foreground">
              {metric.unit}
            </span>
          </div>

          <BarMeter value={metric.value} label={label} className="mt-3" />
        </>
      ) : (
        <div
          className={cn(
            "mt-[7px] text-xl leading-none font-semibold tracking-tight",
            metric.tone === "active" && "text-sd-accent",
            metric.tone === "idle" && "text-muted-foreground",
          )}
        >
          {t(`state.${metric.icon}.${metric.state}`)}
        </div>
      )}
    </div>
  );
}
