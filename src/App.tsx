import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { AppShell } from "@/components/app-shell/app-shell";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore, type ViewId } from "@/stores/navigation-store";

/**
 * メインウィンドウのルート。
 *
 * トレイ/single-instance から Rust が emit するイベントに反応する（決定4）:
 * - "navigate": 指定画面へ遷移する（トレイの「設定」等）。
 * - "main-shown": ウィンドウ表示時に device-store を再ロードする（最小限の同期）。
 */
function App() {
  useEffect(() => {
    const win = getCurrentWindow();
    const unlisteners: Array<() => void> = [];

    void win
      .listen<ViewId>("navigate", (event) => {
        useNavigationStore.getState().navigate(event.payload);
      })
      .then((fn) => unlisteners.push(fn))
      .catch(() => {});

    void win
      .listen("main-shown", () => {
        void useDeviceStore.getState().refresh();
      })
      .then((fn) => unlisteners.push(fn))
      .catch(() => {});

    return () => {
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  return <AppShell />;
}

export default App;
