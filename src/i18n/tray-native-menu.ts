import { invoke } from "@tauri-apps/api/core";

import i18n from "@/i18n";

/**
 * native 右クリックトレイメニュー（ウィンドウを開く / 設定 / 終了）のラベルを
 * 現在の言語へ同期する。翻訳の SSoT は i18n JSON で、解決済みラベルを Rust
 * コマンド `set_tray_menu_labels` に渡す（Rust は翻訳表を持たず `set_text` で反映）。
 *
 * 使用キーは既存のものを再利用する（新規翻訳キーは追加しない）。
 * IPC は外部境界であり、失敗してもユーザー操作を妨げないため握りつぶす（診断はログに残す）。
 */
export function syncNativeTrayMenu(): void {
  void invoke("set_tray_menu_labels", {
    openWindow: i18n.t("tray:openWindow"),
    settings: i18n.t("common:nav.settings"),
    quit: i18n.t("tray:quit"),
  }).catch((error) => {
    console.error("Failed to sync native tray menu labels", error);
  });
}
