import { useEffect, useRef } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { ToastViewport } from "@/components/notice/toast";
import {
  clampHeight,
  MAX_TRAY_HEIGHT,
  TRAY_WIDTH,
} from "@/components/tray/layout";
import { TrayPopover } from "@/components/tray/tray-popover";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";

/**
 * トレイウィンドウ（label="tray"）のルート。
 *
 * device / お気に入りを自前でロードし、`TrayPopover` を全画面表示する
 * （各ウィンドウ独立ロード。決定4）。フォーカス取得時に再ロードし、フォーカスを失ったら
 * 隠す（クリック外し = 閉じる）。位置決めは Rust 側（positioner）が担う。
 *
 * 幅は固定（{@link TRAY_WIDTH}）。高さは内容にフィットさせつつ {@link MAX_TRAY_HEIGHT} で
 * 上限クランプする（各リストは内側スクロールで px 上限に収まるため、これは安全弁）。
 */
export function TrayApp() {
  const rootRef = useRef<HTMLDivElement>(null);

  // 幅は固定し、高さは内容にフィット（フッタ下の余白を無くす）＋上限クランプ。
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const win = getCurrentWindow();
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) {
        void win
          .setSize(new LogicalSize(TRAY_WIDTH, clampHeight(h, MAX_TRAY_HEIGHT)))
          // 失敗を握り潰すと権限不足（capabilities の set-size 欠落）等が無症状化する。
          // 実害のあるエラーは残す（テスト等の非 Tauri 環境では setSize 自体が呼ばれない）。
          .catch((err) => {
            console.error("tray setSize failed", err);
          });
      }
    };
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    apply();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    void useDeviceStore.getState().load();
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
