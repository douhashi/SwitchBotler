import {
  Battery,
  Droplet,
  Gauge,
  type LucideIcon,
  Thermometer,
} from "lucide-react";

import { BarMeter } from "@/components/charts/bar-meter";
import { Sparkline } from "@/components/charts/sparkline";
import type { SensorIcon, SensorMetric } from "@/data";

const METRIC_ICON: Record<SensorIcon, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplet,
  co2: Gauge,
  battery: Battery,
};

/** センサー計測値カード（mockup .stat）。ラベル + 大数値 + スパークライン or メーター。 */
export function StatCard({ metric }: { metric: SensorMetric }) {
  const Icon = METRIC_ICON[metric.icon];

  return (
    <div className="rounded-[15px] bg-card px-[15px] py-3.5 shadow-raise">
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Icon size={14} strokeWidth={1.75} />
        {metric.label}
      </div>

      <div className="mt-[7px] font-mono text-[27px] leading-none font-semibold tracking-tight tabular-nums">
        {metric.value}
        <span className="ml-0.5 text-sm font-medium text-muted-foreground">
          {metric.unit}
        </span>
      </div>

      {metric.display === "sparkline" ? (
        <Sparkline
          data={metric.history ?? []}
          tone={metric.tone}
          className="mt-2.5"
        />
      ) : (
        <BarMeter value={metric.value} label={metric.label} className="mt-3" />
      )}
    </div>
  );
}
