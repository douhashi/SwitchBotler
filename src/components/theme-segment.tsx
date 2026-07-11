import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { type Theme, useThemeStore } from "@/stores/theme-store";

const OPTIONS: { value: Theme; icon: LucideIcon }[] = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

/**
 * テーマ選択のセグメントコントロール（システム / ライト / ダーク）。
 * 設定画面に置き、app-shell の常設トグルは廃止した（mockup 画面05）。
 */
export function ThemeSegment() {
  const { t } = useTranslation("settings");
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex gap-1 rounded-xl bg-background p-1 shadow-inset"
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const label = t(`theme.${value}`);
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[9px] px-4 py-2 text-xs font-semibold transition-colors",
              active
                ? "bg-card text-sd-accent shadow-raise-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={15} strokeWidth={1.9} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
