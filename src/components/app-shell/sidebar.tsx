import { useEffect } from "react";

import { LogoMark, Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { VIEWS } from "@/views/registry";

/** 左サイドバー: ブランド + ナビ + 接続ステータス。 */
export function Sidebar() {
  const activeView = useNavigationStore((s) => s.activeView);
  const navigate = useNavigationStore((s) => s.navigate);

  // 接続状態は App が AppShell 描画前にロード済みのため、ここでは参照のみ行う。
  const connectionStatus = useConnectionStore((s) => s.connection.status);
  const deviceCount = useDeviceStore((s) => s.devices.length);
  const loadDevices = useDeviceStore((s) => s.load);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const connected = connectionStatus === "connected";

  return (
    <aside className="flex flex-col gap-1.5 p-3 pb-3.5">
      <div className="flex items-center gap-2.5 px-2 pt-2 pb-3 text-sm font-bold tracking-tight">
        <span className="grid size-7 place-items-center rounded-[9px] bg-card text-sd-accent shadow-raise-sm">
          <LogoMark size={16} />
        </span>
        <Wordmark />
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
          className={cn(
            "size-2 shrink-0 rounded-full",
            connected ? "bg-sd-ok" : "bg-muted-foreground",
          )}
          style={connected ? { boxShadow: "0 0 8px var(--sd-ok)" } : undefined}
        />
        {connected ? `接続済み · ${deviceCount}台` : "接続待機中"}
      </div>
    </aside>
  );
}
