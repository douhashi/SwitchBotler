/**
 * Tauri IPC 共通ユーティリティ。
 *
 * Rust の `SwitchBotError` は `{ code, message, statusCode? }` にシリアライズされ、`invoke` の
 * reject 値として渡る。`code`（安定コード）と `statusCode`（`apiStatus` のみ）を保持し、
 * 利用者向けの文言化は表示端（React）が `errors` namespace で行う（言語切替に追従）。
 * `message` は Rust 側で秘匿値を除去済みだが、フロントでは診断ログ用途に留める。
 */

/** Rust の SwitchBotError シリアライズ形。 */
type RustError = {
  code?: string;
  message?: string;
  statusCode?: number;
};

/** SwitchBot 由来のオフラインエラーコード（Rust `ErrorCode::Offline` の serde 出力）。 */
const OFFLINE_CODE = "offline";

/**
 * Rust の安定コード（`code`）と HTTP ステータス番号（`statusCode`）を保持したまま
 * フロントで扱えるアプリケーションエラー。文言は表示端で `code` から翻訳する。
 * `message` は診断ログ用の安全な文字列（利用者向け表示には使わない）。
 */
export class AppError extends Error {
  readonly code?: string;
  readonly statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * invoke の reject 値から診断用の安全なメッセージを取り出す（ログ用途）。
 * 秘匿値は Rust 側で除去済み。表示は `code` からの翻訳で行う。
 */
export function toMessage(error: unknown): string {
  // 診断ログ用の英語フォールバック（利用者向け表示は `code` からの翻訳で行う）。
  const fallback = "Communication with the SwitchBot API failed.";
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

/** invoke の reject 値から HTTP ステータス番号（`apiStatus` の補間用）を取り出す。 */
function rawStatusCodeOf(error: unknown): number | undefined {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as RustError).statusCode;
    if (typeof statusCode === "number") return statusCode;
  }
  return undefined;
}

/**
 * invoke の reject 値を {@link AppError}（安定コード + statusCode + 診断メッセージ）へ
 * 変換して投げ直す。`code` を保持することで、フロントは表示端の翻訳やエラー種別分岐に使える。
 */
export function toError(error: unknown): AppError {
  return new AppError(toMessage(error), codeOf(error), rawStatusCodeOf(error));
}

/**
 * デバイスオフライン（Rust `ErrorCode::Offline` / 封筒 statusCode 161）由来のエラーか。
 * device-store がこの判定でオフライン印（`offlineIds`）を付け、UI の操作抑止に使う。
 */
export function isOfflineError(error: unknown): boolean {
  return error instanceof AppError && error.code === OFFLINE_CODE;
}
