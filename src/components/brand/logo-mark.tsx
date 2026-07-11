/**
 * SwitchBotler ブランドマーク（執事の蝶ネクタイ × ON トグルのノブ）。
 * design-system/assets/logo-mark.svg 準拠の単色グリフ。
 * fill/stroke は currentColor で親の color に追従する（面タイルは text-sd-accent 想定）。
 * 名前は隣接するワードマークが提供するため、この SVG は装飾扱い（aria-hidden）。
 */
export function LogoMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" strokeWidth={8} strokeLinejoin="round">
        <polygon points="27,43 27,77 53,60" />
        <polygon points="93,43 93,77 67,60" />
      </g>
      <circle cx="60" cy="60" r="15.5" />
    </svg>
  );
}
