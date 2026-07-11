import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enSettings from "./locales/en/settings.json";
import jaCommon from "./locales/ja/common.json";
import jaSettings from "./locales/ja/settings.json";
import { FALLBACK_LANGUAGE } from "./resolve";

/** 横断的な共通語彙を置く既定 namespace。 */
const defaultNS = "common";

/** 利用可能な namespace（画面/機能単位で分割し、横断語彙は common）。 */
const namespaces = ["common", "settings"] as const;

/**
 * 翻訳リソースはアプリに同梱し同期ロードする（外部フェッチなし）。
 * このため Suspense を使わずに `changeLanguage` だけで即時切替できる。
 */
const resources = {
  ja: { common: jaCommon, settings: jaSettings },
  en: { common: enCommon, settings: enSettings },
} as const;

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: FALLBACK_LANGUAGE,
  ns: namespaces,
  defaultNS,
  interpolation: {
    // React が既定でエスケープするため不要。
    escapeValue: false,
  },
  react: {
    // resources 同梱・同期ロードのため Suspense は不要。
    useSuspense: false,
  },
});

export default i18n;
