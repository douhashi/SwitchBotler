import { ThemeToggle } from "@/components/theme-toggle";
import { useNavigationStore } from "@/stores/navigation-store";
import { getView } from "@/views/registry";
import { Sidebar } from "./sidebar";

/** アプリ全体のレイアウト: サイドバー + メイン（ヘッダ + アクティブ画面）。 */
export function AppShell() {
  const activeView = useNavigationStore((s) => s.activeView);
  const view = getView(activeView);

  return (
    <div className="grid min-h-screen grid-cols-[194px_1fr] bg-background text-foreground">
      <Sidebar />

      <main className="overflow-hidden px-6 py-5">
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{view.label}</h1>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {view.description}
            </p>
          </div>
          <ThemeToggle />
        </header>

        {view.render()}
      </main>
    </div>
  );
}
