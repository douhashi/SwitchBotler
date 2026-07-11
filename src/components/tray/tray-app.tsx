import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { ToastViewport } from "@/components/notice/toast";
import { TrayPopover } from "@/components/tray/tray-popover";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";

/**
 * トレイウィンドウ（label="tray"）のルート。
 *
 * device / connection / お気に入りを自前でロードし、`TrayPopover` を全画面表示する
 * （各ウィンドウ独立ロード。決定4）。フォーカス取得時に再ロードし、フォーカスを失ったら
 * 隠す（クリック外し = 閉じる）。位置決めは Rust 側（positioner）が担う。
 */
export function TrayApp() {
  useEffect(() => {
    void useDeviceStore.getState().load();
    void useConnectionStore.getState().load();
    void useFavoritesStore.getState().load();

    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void win
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          // 表示のたびに最新化する（ユーザー起動・低頻度でレートを踏まない）。
          void useDeviceStore.getState().refresh();
          void useFavoritesStore.getState().reload();
        } else {
          void win.hide();
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        // 非 Tauri 環境（テスト等）では何もしない。
      });

    return () => unlisten?.();
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background p-3.5 text-foreground">
      <TrayPopover />
      <ToastViewport />
    </div>
  );
}
