import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { AppShell } from "@/components/app-shell/app-shell";
import { Onboarding } from "@/components/onboarding/onboarding";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore, type ViewId } from "@/stores/navigation-store";

/**
 * メインウィンドウのルート。
 *
 * 起動時に接続状態をロードし、`connection.saved` を分岐キーにして描画を切り替える:
 * - `!loaded` の間はちらつき防止のため何も描画しない。
 * - `loaded && !saved`（未設定）なら `<Onboarding>`（メニューなし全画面）。
 * - それ以外は通常の `<AppShell>`。`saved && disconnected`（到達不能）もシェルを維持する。
 *
 * 接続成功で `connection.saved` が true になると自動でシェルへ遷移する（追加の遷移コード不要）。
 *
 * あわせてトレイ/single-instance から Rust が emit するイベントに反応する（決定4）:
 * - "navigate": 指定画面へ遷移する（`{ view }`。トレイフッタの「設定」等）。
 * - "main-shown": ウィンドウ表示時、鮮度が古ければ device-store を再ロードする
 *   （TTL ガード。連続表示で SwitchBot API の 1+N 取得を繰り返さない）。
 */
function App() {
  const loaded = useConnectionStore((s) => s.loaded);
  const saved = useConnectionStore((s) => s.connection.saved);

  useEffect(() => {
    void useConnectionStore.getState().load();
  }, []);

  useEffect(() => {
    const win = getCurrentWindow();
    const unlisteners: Array<() => void> = [];

    void win
      .listen<{ view: ViewId }>("navigate", (event) => {
        useNavigationStore.getState().navigate(event.payload.view);
      })
      .then((fn) => unlisteners.push(fn))
      .catch(() => {});

    void win
      .listen("main-shown", () => {
        void useDeviceStore.getState().refreshIfStale();
      })
      .then((fn) => unlisteners.push(fn))
      .catch(() => {});

    return () => {
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  // 接続状態のロード前は分岐を確定できないため、ちらつき防止に何も描画しない（論点3=A）。
  if (!loaded) return null;

  return saved ? <AppShell /> : <Onboarding />;
}

export default App;
