import { cn } from "@/lib/utils";

type BarMeterProps = {
  /** 0-100 の充填率。 */
  value: number;
  className?: string;
  label?: string;
};

/** 電池残量などのメーター。inset-sm トラック + accent フィル。 */
export function BarMeter({ value, className, label }: BarMeterProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-[9px] overflow-hidden rounded-full shadow-inset-sm",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-sd-accent"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
