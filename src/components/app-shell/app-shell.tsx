import { useState } from "react";
import { Zap } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { TrayPopover } from "@/components/tray/tray-popover";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigationStore } from "@/stores/navigation-store";
import { getView } from "@/views/registry";
import { Sidebar } from "./sidebar";

/**
 * アプリ全体のレイアウト: サイドバー + メイン。
 * ヘッダは各 view（ViewHeader）に委譲し、シェルは画面横断機能
 * （トレイプレビュー / テーマ切替）のみを持つ。
 */
export function AppShell() {
  const activeView = useNavigationStore((s) => s.activeView);
  const [trayOpen, setTrayOpen] = useState(false);
  const view = getView(activeView);

  return (
    <div className="grid min-h-screen grid-cols-[194px_1fr] bg-background text-foreground">
      <Sidebar />

      <main className="overflow-hidden px-6 py-5">
        <div className="mb-3 flex items-center justify-end gap-2">
          <Popover open={trayOpen} onOpenChange={setTrayOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="クイックコントロール"
              >
                <Zap strokeWidth={1.75} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3.5">
              <TrayPopover onClose={() => setTrayOpen(false)} />
            </PopoverContent>
          </Popover>
          <ThemeToggle />
        </div>

        {view.render()}
      </main>
    </div>
  );
}
