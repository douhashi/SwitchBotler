import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isDarkActive, useThemeStore } from "@/stores/theme-store";

/** ライト/ダークを切り替えるトグル。prefers-reduced-motion を尊重する。 */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const dark = isDarkActive(theme);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
    </Button>
  );
}
