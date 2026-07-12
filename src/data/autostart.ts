/**
 * ログイン時に起動（autostart）の単一境界。
 *
 * OS のログイン項目登録には `@tauri-apps/plugin-autostart` を使う。プラグイン呼び出しは
 * このモジュールに集約し、他所からは直接触らない（境界の単一化。`data/preferences.ts` と同方針）。
 */
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

/** OS のログイン項目に登録済みか。 */
export async function isAutostartEnabled(): Promise<boolean> {
  return isEnabled();
}

/** ログイン時に起動する（true）/ しない（false）を切り替える。 */
export async function setAutostart(next: boolean): Promise<void> {
  if (next) {
    await enable();
  } else {
    await disable();
  }
}
