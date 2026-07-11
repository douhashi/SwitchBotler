import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/stores/navigation-store";
import { VIEWS } from "@/views/registry";

/** 左サイドバー: ブランド + ナビ + 接続ステータス。 */
export function Sidebar() {
  const activeView = useNavigationStore((s) => s.activeView);
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <aside className="flex flex-col gap-1.5 p-3 pb-3.5">
      <div className="flex items-center gap-2.5 px-2 pt-2 pb-3 text-sm font-bold tracking-tight">
        <span className="grid size-7 place-items-center rounded-[9px] bg-card text-sd-accent shadow-raise-sm">
          <Zap size={16} strokeWidth={1.75} />
        </span>
        SwitchBotler
      </div>

      <nav className="flex flex-col gap-1" aria-label="メインナビゲーション">
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const active = id === activeView;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-background text-sd-accent shadow-inset-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={18} strokeWidth={1.75} className="shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2 rounded-[11px] px-3 py-2.5 text-xs text-muted-foreground shadow-inset-sm">
        <span
          className="size-2 shrink-0 rounded-full bg-sd-ok"
          style={{ boxShadow: "0 0 8px var(--sd-ok)" }}
        />
        接続待機中
      </div>
    </aside>
  );
}
