import { useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Layers, RefreshCw, Zap } from "lucide-react";

import { DeviceIcon } from "@/components/device/device-icon";
import { Switch } from "@/components/ui/switch";
import { dataSource, type Device, hasPowerToggle, type Scene, useScenes } from "@/data";
import { cn } from "@/lib/utils";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";

/** トレイに出す件数の上限（お気に入り優先 + 先頭で補完。決定5）。 */
const MAX_DEVICES = 4;
const MAX_SCENES = 3;

/**
 * お気に入りを先頭に寄せ、残り枠を先頭から補完して上限で切る。
 * 未設定でも先頭 N 件が出るため、初回体験でも即操作できる（決定5）。
 */
function favoritesFirst<T extends { id: string }>(
  items: T[],
  isFavorite: (id: string) => boolean,
  limit: number,
): T[] {
  const favorites = items.filter((i) => isFavorite(i.id));
  const rest = items.filter((i) => !isFavorite(i.id));
  return [...favorites, ...rest].slice(0, limit);
}

/** フッタのテキストリンク（ウィンドウ / 設定 / 終了 で共通）。 */
function FootLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-[9px] py-2 text-center text-[11.5px] text-muted-foreground transition-colors hover:text-foreground active:shadow-inset-sm"
    >
      {children}
    </button>
  );
}

/** トレイに 1 台分のクイックトグル行を描く。 */
function QuickDevice({ device }: { device: Device }) {
  const toggle = useDeviceStore((s) => s.toggle);
  const on = device.controls.power;
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2.5">
      <span
        className={cn(
          "grid size-[30px] shrink-0 place-items-center rounded-[9px]",
          on ? "text-sd-accent shadow-raise-sm" : "text-muted-foreground shadow-inset-sm",
        )}
      >
        <DeviceIcon category={device.category} size={16} strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-[13px] font-medium">{device.name}</span>
      <Switch
        size="sm"
        checked={on}
        onCheckedChange={() => toggle(device.id)}
        aria-label={device.name}
      />
    </div>
  );
}

/** トレイのクイックシーンボタン（タップで実行 = クイックアクション）。 */
function QuickScene({ scene }: { scene: Scene }) {
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    setRunning(true);
    setFailed(false);
    try {
      await dataSource.executeScene(scene.id);
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={running}
      aria-label={`${scene.name} を実行`}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[11.5px] font-semibold shadow-raise-sm active:shadow-inset-sm disabled:opacity-70",
        failed && "text-destructive",
      )}
    >
      {running ? (
        <RefreshCw size={13} strokeWidth={2} className="animate-spin" />
      ) : (
        <Layers size={13} strokeWidth={1.9} className="text-sd-accent" />
      )}
      {failed ? "失敗" : scene.name}
    </button>
  );
}

/**
 * トレイのポップオーバー本体（mockup 06）。実データ結線済み（#10）。
 * フッタは Tauri コマンド（show_main_window / quit / hide_tray_popup）へ結線する。
 */
export function TrayPopover() {
  const devices = useDeviceStore((s) => s.devices);
  const loading = useDeviceStore((s) => s.loading);
  const loaded = useDeviceStore((s) => s.loaded);
  const error = useDeviceStore((s) => s.error);
  const connection = useConnectionStore((s) => s.connection);
  const favoriteDeviceIds = useFavoritesStore((s) => s.deviceIds);
  const favoriteSceneIds = useFavoritesStore((s) => s.sceneIds);
  const { data: scenes } = useScenes();

  const connected = connection.status === "connected";
  const togglable = devices.filter(hasPowerToggle);
  const quickDevices = favoritesFirst(togglable, (id) => favoriteDeviceIds.has(id), MAX_DEVICES);
  const quickScenes = favoritesFirst(
    scenes ?? [],
    (id) => favoriteSceneIds.has(id),
    MAX_SCENES,
  );

  const openMain = () => {
    void invoke("show_main_window", { view: null });
    void invoke("hide_tray_popup");
  };
  const openSettings = () => {
    void invoke("show_main_window", { view: "settings" });
    void invoke("hide_tray_popup");
  };
  const quit = () => void invoke("quit");

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1.5 pb-3">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <span className="grid size-[22px] place-items-center rounded-[7px] bg-card text-sd-accent shadow-raise-sm">
            <Zap size={13} strokeWidth={1.9} />
          </span>
          SwitchBotler
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-sd-ok" : "bg-muted-foreground",
            )}
            style={connected ? { boxShadow: "0 0 6px var(--sd-ok)" } : undefined}
          />
          {connected ? "接続済み" : "未接続"}
        </span>
      </div>

      {loading && devices.length === 0 && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">読み込み中…</p>
      )}
      {loaded && !connected && quickDevices.length === 0 && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
          未接続です。設定から接続してください。
        </p>
      )}
      {loaded && connected && quickDevices.length === 0 && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
          操作できるデバイスがありません。
        </p>
      )}

      {quickDevices.map((device) => (
        <QuickDevice key={device.id} device={device} />
      ))}

      {error && <p className="px-2 pt-1 text-[11px] text-destructive">{error}</p>}

      {quickScenes.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          <div className="flex flex-wrap gap-2 px-1 pb-2">
            {quickScenes.map((scene) => (
              <QuickScene key={scene.id} scene={scene} />
            ))}
          </div>
        </>
      )}

      <div className="my-2 h-px bg-border" />

      <div className="flex gap-2">
        <FootLink onClick={openMain}>ウィンドウを開く</FootLink>
        <FootLink onClick={openSettings}>設定</FootLink>
        <FootLink onClick={quit}>終了</FootLink>
      </div>
    </div>
  );
}
