/**
 * Rust `SwitchBotError` の安定コードをフロントの翻訳キーへ橋渡しする層。
 *
 * Rust `ErrorCode`（serde camelCase）を SSoT としてミラーした {@link AppErrorCode} を
 * 定義し、`AppError.code` を union へ検証して返す。文言化は表示端（React）が
 * `t(code, { statusCode })` で行い、言語切替に追従させる（ストアはコードのみ保持）。
 */

import { AppError } from "@/data/ipc";

/**
 * アプリで扱うエラーコード。Rust `switchbot/error.rs` の `ErrorCode`（serde camelCase 出力）
 * を漏れなくミラーし、未知・欠損は `unknown` に寄せる。`errors` namespace のキーと 1:1 対応。
 */
export type AppErrorCode =
  | "unauthorized"
  | "rateLimited"
  | "apiStatus"
  | "offline"
  | "network"
  | "storage"
  | "missingCredentials"
  | "unknown";

/** union の網羅チェックに使う既知コード集合（SSoT）。 */
const KNOWN_CODES = new Set<AppErrorCode>([
  "unauthorized",
  "rateLimited",
  "apiStatus",
  "offline",
  "network",
  "storage",
  "missingCredentials",
  "unknown",
]);

function isAppErrorCode(value: string): value is AppErrorCode {
  return KNOWN_CODES.has(value as AppErrorCode);
}

/**
 * 任意のエラー値から {@link AppErrorCode} を取り出す。
 * `AppError.code` が既知コードならそれを、未知・欠損なら `unknown` を返す。
 */
export function errorCodeOf(error: unknown): AppErrorCode {
  const code = error instanceof AppError ? error.code : undefined;
  return code !== undefined && isAppErrorCode(code) ? code : "unknown";
}

/**
 * 任意のエラー値から HTTP ステータス番号（`apiStatus` の補間用）を取り出す。
 * 保持していなければ `undefined`。
 */
export function statusCodeOf(error: unknown): number | undefined {
  return error instanceof AppError ? error.statusCode : undefined;
}
