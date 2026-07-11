import { useEffect, useRef } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
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
 *
 * ウィンドウ高さは内容にフィットさせる（お気に入り件数で内容量が変わるため、
 * 固定高だとフッタ下に無駄な余白が出る。決定変更）。
 */
export function TrayApp() {
  const rootRef = useRef<HTMLDivElement>(null);

  // 内容の高さにウィンドウをフィットさせ、フッタ下の余白を無くす。
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const win = getCurrentWindow();
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) {
        void win.setSize(new LogicalSize(window.innerWidth, h)).catch(() => {});
      }
    };
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    apply();
    return () => observer.disconnect();
  }, []);

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
    <div
      ref={rootRef}
      className="flex flex-col overflow-hidden bg-background px-3.5 pt-3.5 pb-2 text-foreground"
    >
      <TrayPopover />
      <ToastViewport />
    </div>
  );
}
