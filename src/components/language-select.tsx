import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LanguagePreference } from "@/i18n/resolve";
import { useLanguageStore } from "@/stores/language-store";

const OPTIONS: LanguagePreference[] = ["system", "ja", "en"];

/**
 * 言語選択のコンボボックス（システムに従う / 日本語 / English）。
 * `theme-segment.tsx` と対になる位置づけで、language-store に結線する。
 */
export function LanguageSelect() {
  const { t } = useTranslation("common");
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <Select
      value={language}
      onValueChange={(value) => setLanguage(value as LanguagePreference)}
    >
      <SelectTrigger aria-label={t("language.label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((value) => (
          <SelectItem key={value} value={value}>
            {t(`language.${value}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
