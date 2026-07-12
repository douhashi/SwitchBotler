import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { DeviceAction } from "@/components/device/device-action";
import { DeviceCard } from "@/components/device/device-card";
import { DeviceDetail } from "@/components/device/device-detail";
import { DeviceIcon } from "@/components/device/device-icon";
import { OtherDevicesSection } from "@/components/device/other-devices-section";
import { FavoriteRow } from "@/components/favorites/favorite-row";
import { FavoritesSection } from "@/components/favorites/favorites-section";
import { useDragReorder } from "@/components/favorites/use-drag-reorder";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { type Device, deviceStatusLabel, isOtherDevice } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useNavigationStore } from "@/stores/navigation-store";

export function DevicesView() {
  const { t } = useTranslation("devices");
  const { t: tc } = useTranslation("common");
  const devices = useDeviceStore((s) => s.devices);
  const loading = useDeviceStore((s) => s.loading);
  const loaded = useDeviceStore((s) => s.loaded);
  const error = useDeviceStore((s) => s.error);
  const load = useDeviceStore((s) => s.load);
  const refresh = useDeviceStore((s) => s.refresh);
  const offlineIds = useDeviceStore((s) => s.offlineIds);
  const selectedDeviceId = useNavigationStore((s) => s.selectedDeviceId);
  const favoriteIds = useFavoritesStore((s) => s.deviceIds);
  const loadFavorites = useFavoritesStore((s) => s.load);
  const toggleFavorite = useFavoritesStore((s) => s.toggleDeviceFavorite);
  const moveFavorite = useFavoritesStore((s) => s.moveDeviceFavorite);
  const reorderFavorite = useFavoritesStore((s) => s.reorderDeviceFavorite);

  const [editing, setEditing] = useState(false);
  const { draggingId, overId, rowProps } = useDragReorder(reorderFavorite);

  useEffect(() => {
    load();
    loadFavorites();
  }, [load, loadFavorites]);

  const selected = devices.find((d) => d.id === selectedDeviceId);
  if (selected) return <DeviceDetail device={selected} />;

  // 操作可デバイスは主一覧・お気に入りに、操作もセンサー読み取りもできない
  // 「その他」は末尾の折りたたみセクションに振り分ける。
  const others = devices.filter(isOtherDevice);
  const operable = devices.filter((d) => !isOtherDevice(d));
  // お気に入りは **登録順（favoriteIds の並び）** で描く。この順がトレイの表示順にもなる。
  const favorites = favoriteIds
    .map((id) => operable.find((d) => d.id === id))
    .filter((d): d is Device => d !== undefined);

  return (
    <div>
      <ViewHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} strokeWidth={2} />
            {tc("actions.refresh")}
          </Button>
        }
      />
      {loading && devices.length === 0 && <LoadingState />}
      {error && devices.length === 0 && (
        <ErrorState code={error} onRetry={refresh} />
      )}
      {loaded && !error && devices.length === 0 && (
        <EmptyState>{t("empty")}</EmptyState>
      )}

      {favorites.length > 0 && (
        <FavoritesSection
          title={t("favorites")}
          editing={editing}
          onToggleEditing={() => setEditing((v) => !v)}
          reorderable={favorites.length > 1}
        >
          {favorites.map((device, index) => (
            <FavoriteRow
              key={device.id}
              name={device.name}
              status={deviceStatusLabel(device, t)}
              icon={
                <DeviceIcon category={device.category} size={20} strokeWidth={1.75} />
              }
              iconActive={device.controls.power}
              offline={offlineIds.has(device.id)}
              action={<DeviceAction device={device} />}
              editing={editing}
              position={index + 1}
              total={favorites.length}
              canMoveUp={index > 0}
              canMoveDown={index < favorites.length - 1}
              onMoveUp={() => moveFavorite(device.id, "up")}
              onMoveDown={() => moveFavorite(device.id, "down")}
              onUnfavorite={() => toggleFavorite(device.id)}
              dragging={draggingId === device.id}
              dragOver={overId === device.id}
              dragProps={rowProps(device.id, editing)}
            />
          ))}
        </FavoritesSection>
      )}

      {operable.length > 0 && (
        <section>
          {favorites.length > 0 && (
            <h2 className="mb-2 px-0.5 text-xs font-semibold text-muted-foreground">
              {t("all")}
            </h2>
          )}
          <div className="grid-cards">
            {operable.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        </section>
      )}

      <OtherDevicesSection devices={others} />
    </div>
  );
}
