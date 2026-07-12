import { Slider } from "@/components/ui/slider";

/**
 * 「ラベル ＋ 値% ＋ 0-100 スライダー」の共通カード。
 * brightness（明るさ）と position（開度）は同形のため 1 コンポーネントに集約する（DRY）。
 */
export function PercentSliderCard({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-3 rounded-2xl bg-card p-4 shadow-raise">
      <div className="mb-3 flex items-center justify-between text-[12.5px] text-muted-foreground">
        <span>{label}</span>
        <b className="font-mono font-semibold text-foreground">{value}%</b>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        disabled={disabled}
        aria-label={label}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
