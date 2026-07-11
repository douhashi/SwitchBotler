import { create } from "zustand";
import { persist } from "zustand/middleware";

/** テーマ選択。`system` は OS の配色設定に追従する。 */
export type Theme = "light" | "dark" | "system";

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const DARK_MEDIA = "(prefers-color-scheme: dark)";
const STORAGE_KEY = "switchbotler-theme";

/** テーマ設定を実際の light/dark に解決する。 */
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia(DARK_MEDIA).matches ? "dark" : "light";
  }
  return theme;
}

/** `.dark` クラスの付与/除去で shadcn の配色を切り替える（shadcn 標準方式）。 */
export function applyTheme(theme: Theme): void {
  const isDark = resolveTheme(theme) === "dark";
  document.documentElement.classList.toggle("dark", isDark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

// OS の配色変更に追従する（theme が system のときのみ再適用）。
if (typeof window !== "undefined" && "matchMedia" in window) {
  window.matchMedia(DARK_MEDIA).addEventListener("change", () => {
    if (useThemeStore.getState().theme === "system") {
      applyTheme("system");
    }
  });
}

/** 現在の設定が実際に dark として描画されるかを判定する。 */
export function isDarkActive(theme: Theme): boolean {
  return resolveTheme(theme) === "dark";
}
