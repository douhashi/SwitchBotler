/** アプリが対応する言語コード。 */
export type SupportedLanguage = "ja" | "en";

/** ユーザーの言語設定。`system` は OS/ブラウザの言語に追従する。 */
export type LanguagePreference = "system" | SupportedLanguage;

/** 対応言語の SSoT。言語を追加するときはここへ足す。 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ["ja", "en"];

/** 未対応言語を寄せるフォールバック言語。 */
export const FALLBACK_LANGUAGE: SupportedLanguage = "en";

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * 言語設定を実際の描画言語に解決する。
 * 保存値（ja/en）を優先し、`system` は `navigator.language` の先頭 2 文字で判定、
 * 対応外の言語は {@link FALLBACK_LANGUAGE} へフォールバックする。
 */
export function resolveLanguage(pref: LanguagePreference): SupportedLanguage {
  if (pref === "system") {
    const lang = navigator.language.slice(0, 2).toLowerCase();
    return isSupportedLanguage(lang) ? lang : FALLBACK_LANGUAGE;
  }
  return pref;
}
