import { useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Layers, Pin, Play, RefreshCw } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/brand";
import { DeviceIcon } from "@/components/device/device-icon";
import { Switch } from "@/components/ui/switch";
import { dataSource, type Device, hasPowerToggle, type Scene, useScenes } from "@/data";
import { cn } from "@/lib/utils";
import { useConnectionStore } from "@/stores/connection-store";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";

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

/** トレイのクイックシーン行（縦 1 列ずつ）。タップで実行 = クイックアクション。 */
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
      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-shadow hover:shadow-inset-sm active:shadow-inset-sm disabled:opacity-70"
    >
      <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-sd-accent shadow-raise-sm">
        {running ? (
          <RefreshCw size={15} strokeWidth={2} className="animate-spin" />
        ) : (
          <Layers size={15} strokeWidth={1.9} />
        )}
      </span>
      <span className="flex-1 text-[13px] font-medium">{scene.name}</span>
      {failed ? (
        <span className="text-[11px] text-destructive">失敗</span>
      ) : (
        <Play size={15} strokeWidth={2} className="shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

/** お気に入りデバイスが未登録のときの空表示。 */
function EmptyFavorites() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3.5 pt-5 pb-5 text-center">
      <span className="grid size-10 place-items-center rounded-xl text-muted-foreground shadow-inset-sm">
        <Pin size={19} strokeWidth={1.75} />
      </span>
      <div className="text-[12.5px] font-semibold text-foreground">
        お気に入りデバイスがありません
      </div>
      <div className="max-w-[22ch] text-[11px] text-muted-foreground">
        デバイス画面でピン留めすると、ここに表示されます。
      </div>
    </div>
  );
}

/**
 * トレイのポップオーバー本体（mockup 06）。実データ結線済み（#10）。
 *
 * お気に入りに登録したデバイス / シーンのみを表示する（決定変更: 補完はしない）。
 * お気に入りデバイスが無ければ空表示、お気に入りシーンが無ければシーンセクションごと省く。
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
  // お気に入りのみ表示。デバイスは電源トグル可能なもの（カーテン等は詳細操作のため除外）。
  const favoriteDevices = devices
    .filter(hasPowerToggle)
    .filter((d) => favoriteDeviceIds.has(d.id));
  const favoriteScenes = (scenes ?? []).filter((s) => favoriteSceneIds.has(s.id));

  const openMain = () => {
    void invoke("show_main_window", { view: null });
    void invoke("hide_tray_popup");
  };
  const openSettings = () => {
    void invoke("show_main_window", { view: "settings" });
    void invoke("hide_tray_popup");
  };
  const quit = () => void invoke("quit");

  const showLoading = loading && devices.length === 0;
  const showDisconnected = loaded && !connected && favoriteDevices.length === 0;
  const showEmptyFavorites =
    loaded && connected && favoriteDevices.length === 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1.5 pb-3">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <span className="grid size-[22px] place-items-center rounded-[7px] bg-card text-sd-accent shadow-raise-sm">
            <LogoMark size={13} />
          </span>
          <Wordmark />
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

      {showLoading && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">読み込み中…</p>
      )}
      {showDisconnected && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
          未接続です。設定から接続してください。
        </p>
      )}
      {showEmptyFavorites && <EmptyFavorites />}

      {favoriteDevices.map((device) => (
        <QuickDevice key={device.id} device={device} />
      ))}

      {error && <p className="px-2 pt-1 text-[11px] text-destructive">{error}</p>}

      {favoriteScenes.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            お気に入りシーン
          </p>
          <div className="flex flex-col gap-0.5">
            {favoriteScenes.map((scene) => (
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
