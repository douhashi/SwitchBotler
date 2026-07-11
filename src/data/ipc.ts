/**
 * Tauri IPC 共通ユーティリティ。
 *
 * Rust の `SwitchBotError` は `{ code, message }` にシリアライズされ、`invoke` の
 * reject 値として渡る。message は Rust 側で秘匿値を含まない安全な日本語に整形済みのため、
 * そのまま利用者向け表示に使える。
 */

/** Rust の SwitchBotError シリアライズ形。 */
type RustError = {
  code?: string;
  message?: string;
};

/**
 * invoke の reject 値から利用者向けの安全な日本語メッセージを取り出す。
 * 秘匿値は Rust 側で除去済みのメッセージをそのまま使う。
 */
export function toMessage(error: unknown): string {
  const fallback = "SwitchBot API との通信に失敗しました。";
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as RustError).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

/** invoke の reject 値を Error（安全なメッセージ）へ変換して投げ直す。 */
export function toError(error: unknown): Error {
  return new Error(toMessage(error));
}
