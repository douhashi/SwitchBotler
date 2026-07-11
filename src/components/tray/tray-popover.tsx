import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight, Hand, Layers, Pin, Play, RefreshCw } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/brand";
import { DeviceIcon } from "@/components/device/device-icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  dataSource,
  type Device,
  deviceInteraction,
  deviceStatusLabel,
  type Scene,
  useScenes,
} from "@/data";
import { cn } from "@/lib/utils";
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

/**
 * トレイに 1 台分のクイック操作行を描く。
 *
 * ウィンドウの DeviceCard と同じく `deviceInteraction()` の 3 分岐で操作系を出す:
 * - toggle: Switch を直接表示（電源のみのデバイス）
 * - press: 「押す」ボタン（pressMode の Bot）
 * - detail: 右端の「>」でメインウィンドウを前面化しつつ該当デバイスの詳細を開く
 *
 * 詳細遷移だけはトレイが別ウィンドウのため、`navigation-store` を直接触らず
 * `show_main_window({ view, deviceId })` + `hide_tray_popup` を invoke する。
 * オフライン規則・状態ラベルの導出（`deviceStatusLabel`）は DeviceCard と共有する。
 */
function QuickDevice({ device }: { device: Device }) {
  const { t } = useTranslation("devices");
  const toggle = useDeviceStore((s) => s.toggle);
  const press = useDeviceStore((s) => s.press);
  const offline = useDeviceStore((s) => s.offlineIds.has(device.id));
  const interaction = deviceInteraction(device);
  const on = device.controls.power;
  const iconActive = on && !offline;

  const openDetail = () => {
    void invoke("show_main_window", { view: "devices", deviceId: device.id });
    void invoke("hide_tray_popup");
  };

  return (
    <div
      aria-disabled={offline || undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2 py-2.5",
        offline && "opacity-50",
      )}
    >
      <span
        className={cn(
          "grid size-[30px] shrink-0 place-items-center rounded-[9px]",
          iconActive
            ? "text-sd-accent shadow-raise-sm"
            : "text-muted-foreground shadow-inset-sm",
        )}
      >
        <DeviceIcon category={device.category} size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{device.name}</div>
        {/* 状態サブラベルは status のみ（model は前置しない）。色だけに頼らず
            オフラインの理由も併記する。導出は DeviceCard と同じ deviceStatusLabel。 */}
        <div
          className={cn(
            "mt-0.5 truncate text-[11px]",
            offline ? "text-sd-warn" : "text-muted-foreground",
          )}
        >
          {deviceStatusLabel(device, t)}
          {offline && ` · ${t("offline")}`}
        </div>
      </div>
      {interaction === "detail" && (
        <button
          type="button"
          aria-label={t("detailAria", { name: device.name })}
          aria-disabled={offline || undefined}
          onClick={openDetail}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
            offline && "pointer-events-none",
          )}
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}
      {interaction === "toggle" && (
        <Switch
          size="sm"
          checked={on}
          disabled={offline}
          aria-disabled={offline || undefined}
          onCheckedChange={() => toggle(device.id)}
          aria-label={device.name}
          className={cn(offline && "pointer-events-none")}
        />
      )}
      {interaction === "press" && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={t("pressAria", { name: device.name })}
          disabled={offline}
          aria-disabled={offline || undefined}
          onClick={() => press(device.id)}
          className={cn("text-foreground", offline && "pointer-events-none")}
        >
          <Hand size={15} strokeWidth={2} />
          {t("press")}
        </Button>
      )}
    </div>
  );
}

/** トレイのクイックシーン行（縦 1 列ずつ）。タップで実行 = クイックアクション。 */
function QuickScene({ scene }: { scene: Scene }) {
  const { t } = useTranslation("scenes");
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
      aria-label={t("runAria", { name: scene.name })}
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
        <span className="text-[11px] text-destructive">{t("failed")}</span>
      ) : (
        <Play size={15} strokeWidth={2} className="shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

/** お気に入りデバイスが未登録のときの空表示。 */
function EmptyFavorites() {
  const { t } = useTranslation("tray");
  return (
    <div className="flex flex-col items-center gap-1.5 px-3.5 pt-5 pb-5 text-center">
      <span className="grid size-10 place-items-center rounded-xl text-muted-foreground shadow-inset-sm">
        <Pin size={19} strokeWidth={1.75} />
      </span>
      <div className="text-[12.5px] font-semibold text-foreground">
        {t("emptyFavoritesTitle")}
      </div>
      <div className="max-w-[22ch] text-[11px] text-muted-foreground">
        {t("emptyFavoritesBody")}
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
  const { t } = useTranslation("tray");
  const { t: tc } = useTranslation("common");
  const { t: te } = useTranslation("errors");
  const devices = useDeviceStore((s) => s.devices);
  const loading = useDeviceStore((s) => s.loading);
  const loaded = useDeviceStore((s) => s.loaded);
  const error = useDeviceStore((s) => s.error);
  const favoriteDeviceIds = useFavoritesStore((s) => s.deviceIds);
  const favoriteSceneIds = useFavoritesStore((s) => s.sceneIds);
  const { data: scenes } = useScenes();

  // 接続表示は「実際に API に到達できているか」= デバイス取得の成否で判定する。
  // トレイは別ウィンドウで connection ストアを focus 時に再取得しないため、
  // connection.status に依存すると起動時（保存前）の「未接続」が固定化してしまう。
  // device-store は focus のたびに再取得されるので、こちらが正確。
  const connected = loaded && !error;
  // お気に入りのみ表示。全種別を対象にし、操作系は QuickDevice が 3 分岐で出し分ける
  // （カーテン・エアコン等は詳細「>」、pressMode の Bot は「押す」、電源のみは Switch）。
  const favoriteDevices = devices.filter((d) => favoriteDeviceIds.has(d.id));
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
          {connected ? tc("states.connected") : tc("states.disconnected")}
        </span>
      </div>

      {showLoading && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
          {tc("states.loading")}
        </p>
      )}
      {showDisconnected && (
        <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
          {t("disconnectedNote")}
        </p>
      )}
      {showEmptyFavorites && <EmptyFavorites />}

      {favoriteDevices.map((device) => (
        <QuickDevice key={device.id} device={device} />
      ))}

      {error && (
        <p className="px-2 pt-1 text-[11px] text-destructive">{te(error)}</p>
      )}

      {favoriteScenes.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("favoriteScenes")}
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
        <FootLink onClick={openMain}>{t("openWindow")}</FootLink>
        <FootLink onClick={openSettings}>{tc("nav.settings")}</FootLink>
        <FootLink onClick={quit}>{t("quit")}</FootLink>
      </div>
    </div>
  );
}
