import { cn } from "@/lib/utils";
import type { SensorTone } from "@/data";

const TONE_COLOR: Record<SensorTone, string> = {
  accent: "var(--sd-accent)",
  muted: "var(--muted-foreground)",
  ok: "var(--sd-ok)",
};

const WIDTH = 120;
const HEIGHT = 26;
const PAD = 3;

type SparklineProps = {
  data: number[];
  tone?: SensorTone;
  className?: string;
};

/**
 * 自前 SVG のスパークライン。折れ線 + 下方向の塗り + 末尾ドット。
 * 追加チャートライブラリは導入せず、data から points を算出する。
 */
export function Sparkline({ data, tone = "accent", className }: SparklineProps) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const points = data.map((value, i) => {
    const x = data.length === 1 ? WIDTH / 2 : (i / (data.length - 1)) * WIDTH;
    const y = PAD + (1 - (value - min) / span) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const [firstX] = points[0];
  const [lastX, lastY] = points[points.length - 1];
  const area = `M${firstX},${HEIGHT} ${points
    .map(([x, y]) => `L${x},${y}`)
    .join(" ")} L${lastX},${HEIGHT} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("block h-[26px] w-full", className)}
      style={{ color: TONE_COLOR[tone] }}
    >
      <path d={area} fill="currentColor" fillOpacity={0.14} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.6} fill="currentColor" />
    </svg>
  );
}
