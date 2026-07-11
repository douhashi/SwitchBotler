import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MinusCircle } from "lucide-react";

import { ToastViewport } from "@/components/notice/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  loadCloseToTrayNoticeSeen,
  saveCloseToTrayNoticeSeen,
} from "@/data/preferences";
import { useNavigationStore } from "@/stores/navigation-store";
import { getView } from "@/views/registry";
import { Sidebar } from "./sidebar";

/**
 * アプリ全体のレイアウト: サイドバー + メイン。
 *
 * ヘッダは各 view（ViewHeader）に委譲する。シェルは全画面トースト・close-to-tray の
 * 初回案内を担う（テーマ切替は設定画面へ移動。アプリ内トレイプレビューは撤去。決定6）。
 */
export function AppShell() {
  const activeView = useNavigationStore((s) => s.activeView);
  const view = getView(activeView);

  const [noticeOpen, setNoticeOpen] = useState(false);
  // 初回案内済みか。onCloseRequested の同期ハンドラから最新値を読むため ref で保持する。
  const noticeSeenRef = useRef(true);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    // 案内フラグを確定させてから close ハンドラを登録する
    // （登録時点で「初回か否か」が確実に分かるようにする）。
    const setup = async () => {
      try {
        noticeSeenRef.current = await loadCloseToTrayNoticeSeen();
      } catch {
        // 読込失敗時は案内済み扱い（案内が毎回出るのを避ける）。
        noticeSeenRef.current = true;
      }
      // × は終了せずトレイへ常駐する（close-to-tray）。初回のみ案内してから隠す（決定3）。
      const fn = await getCurrentWindow().onCloseRequested((event) => {
        event.preventDefault();
        if (noticeSeenRef.current) {
          void getCurrentWindow().hide();
        } else {
          setNoticeOpen(true);
        }
      });
      if (disposed) fn();
      else unlisten = fn;
    };

    void setup().catch(() => {});

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const acknowledgeNotice = () => {
    noticeSeenRef.current = true;
    setNoticeOpen(false);
    void saveCloseToTrayNoticeSeen();
    void getCurrentWindow().hide();
  };

  return (
    <div className="grid min-h-screen grid-cols-[194px_1fr] bg-background text-foreground">
      <Sidebar />

      <main className="overflow-hidden px-6 py-5">{view.render()}</main>

      <ToastViewport />

      <AlertDialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <MinusCircle className="text-sd-accent" strokeWidth={1.75} />
            </AlertDialogMedia>
            <AlertDialogTitle>トレイに常駐します</AlertDialogTitle>
            <AlertDialogDescription>
              ウィンドウを閉じてもアプリは終了せず、メニューバー（トレイ）に常駐して動作を続けます。
              完全に終了するにはトレイアイコンのメニューから「終了」を選んでください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={acknowledgeNotice}>
              分かりました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
