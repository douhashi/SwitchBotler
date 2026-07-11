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

/** SwitchBot 由来のオフラインエラーコード（Rust `ErrorCode::Offline` の serde 出力）。 */
const OFFLINE_CODE = "offline";

/**
 * Rust の安定コード（`code`）を保持したままフロントで扱えるアプリケーションエラー。
 * `message` は Rust 側で秘匿値を除去済みの安全な日本語をそのまま利用者向け表示に使う。
 */
export class AppError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

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

/** invoke の reject 値から Rust の安定コード（`code`）を取り出す。 */
function codeOf(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as RustError).code;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return undefined;
}

/**
 * invoke の reject 値を {@link AppError}（安全なメッセージ + 安定コード）へ変換して投げ直す。
 * `code` を保持することで、フロントは `isOfflineError` 等でエラー種別により分岐できる。
 */
export function toError(error: unknown): AppError {
  return new AppError(toMessage(error), codeOf(error));
}

/**
 * デバイスオフライン（Rust `ErrorCode::Offline` / 封筒 statusCode 161）由来のエラーか。
 * device-store がこの判定でオフライン印（`offlineIds`）を付け、UI の操作抑止に使う。
 */
export function isOfflineError(error: unknown): boolean {
  return error instanceof AppError && error.code === OFFLINE_CODE;
}
