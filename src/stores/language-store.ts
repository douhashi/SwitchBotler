import { create } from "zustand";
import { persist } from "zustand/middleware";

import i18n from "@/i18n";
import { type LanguagePreference, resolveLanguage } from "@/i18n/resolve";
import { syncNativeTrayMenu } from "@/i18n/tray-native-menu";

type LanguageState = {
  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
};

const STORAGE_KEY = "switchbotler-language";

/**
 * 言語設定を i18next へ反映する。設定は保存値優先で解決される。
 * store → i18n の単方向依存にして循環 import を避ける。
 */
export function applyLanguage(language: LanguagePreference): void {
  void i18n.changeLanguage(resolveLanguage(language));
  // native 右クリックトレイメニューも同言語へ追従させる（起動 / rehydrate / setLanguage の全経路）。
  syncNativeTrayMenu();
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "system",
      setLanguage: (language) => {
        applyLanguage(language);
        set({ language });
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) applyLanguage(state.language);
      },
    },
  ),
);
