import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { DeviceCard } from "@/components/device/device-card";
import { DeviceDetail } from "@/components/device/device-detail";
import { OtherDevicesSection } from "@/components/device/other-devices-section";
import { FavoriteContextMenu } from "@/components/favorites/favorite-context-menu";
import { FavoritesSection } from "@/components/favorites/favorites-section";
import { ReorderControls } from "@/components/favorites/reorder-controls";
import { useFavoritesDnd } from "@/components/favorites/use-favorites-dnd";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { type Device, isOtherDevice } from "@/data";
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
  const selectedDeviceId = useNavigationStore((s) => s.selectedDeviceId);
  const favoriteIds = useFavoritesStore((s) => s.deviceIds);
  const loadFavorites = useFavoritesStore((s) => s.load);
  const place = useFavoritesStore((s) => s.placeDeviceFavorite);
  const remove = useFavoritesStore((s) => s.removeDeviceFavorite);
  const toggle = useFavoritesStore((s) => s.toggleDeviceFavorite);
  const move = useFavoritesStore((s) => s.moveDeviceFavorite);

  const [editing, setEditing] = useState(false);
  const {
    draggingId,
    insertAt,
    overRemove,
    cardProps,
    favoritesZoneProps,
    removeZoneProps,
  } = useFavoritesDnd({
    favoriteIds,
    onPlace: place,
    onRemove: remove,
  });

  useEffect(() => {
    load();
    loadFavorites();
  }, [load, loadFavorites]);

  const selected = devices.find((d) => d.id === selectedDeviceId);
  if (selected) return <DeviceDetail device={selected} />;

  // 操作もセンサー読み取りもできない「未対応」は末尾の折りたたみへ。
  const unsupported = devices.filter(isOtherDevice);
  const operable = devices.filter((d) => !isOtherDevice(d));

  // お気に入りは **登録順**（この順がトレイの表示順にもなる）。
  const favorites = favoriteIds
    .map((id) => operable.find((d) => d.id === id))
    .filter((d): d is Device => d !== undefined);
  // 「その他」＝お気に入りに入っていないデバイス。登録は**移動**なのでここから消える
  // （居場所そのものが状態になり、「登録済み」を示す印が要らない）。
  const rest = operable.filter((d) => !favoriteIds.includes(d.id));

  /** お気に入り行を描く。並び替えモードでは操作系を ↑↓ に差し替える。 */
  const favoriteRow = (device: Device, index: number) => (
    <FavoriteContextMenu
      key={device.id}
      favorite
      onAdd={() => toggle(device.id)}
      onRemove={() => remove(device.id)}
    >
      <DeviceCard
        device={device}
        label={tc("favorites.positionAria", {
          name: device.name,
          position: index + 1,
          total: favorites.length,
        })}
        dragging={draggingId === device.id}
        dragProps={cardProps(device.id)}
        control={
          editing ? (
            <ReorderControls
              name={device.name}
              canMoveUp={index > 0}
              canMoveDown={index < favorites.length - 1}
              onMoveUp={() => move(device.id, "up")}
              onMoveDown={() => move(device.id, "down")}
            />
          ) : undefined
        }
      />
    </FavoriteContextMenu>
  );

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

      {/* お気に入り = ドロップ先。空でも必ず出す（そうしないとドラッグできると気づけない）。 */}
      {operable.length > 0 && (
        <FavoritesSection
          title={t("favorites")}
          count={favorites.length}
          editing={editing}
          onToggleEditing={() => setEditing((v) => !v)}
          zoneProps={favoritesZoneProps}
          active={draggingId !== null && insertAt !== null}
        >
          {/* listitem は list の直下に置く（ラッパで挟まない）。 */}
          {favorites.map((device, index) => (
            <Fragment key={device.id}>
              {/* 落とし込み位置の目印（ここに入る、が見える）。 */}
              {insertAt === index && <DropLine />}
              {favoriteRow(device, index)}
            </Fragment>
          ))}
          {insertAt === favorites.length && <DropLine />}
        </FavoritesSection>
      )}

      {/* その他 = お気に入りに入っていないデバイス。ここへ落とすとお気に入りから外れる。 */}
      {rest.length > 0 && (
        <section
          {...removeZoneProps}
          className={cn(
            "rounded-2xl p-2.5 transition-colors",
            // 解除は破壊寄りの操作なので赤系。お気に入りへ入れる側（インディゴ）と対にする。
            // outline を使う理由は FavoritesSection と同じ（ring は box-shadow を奪い合う）。
            overRemove &&
              "bg-destructive/5 outline-2 -outline-offset-2 outline-destructive",
          )}
        >
          <h2 className="mb-2 px-0.5 text-xs font-semibold text-muted-foreground">
            {t("all")}
          </h2>
          <div role="list" aria-label={t("all")} className="grid-cards">
            {rest.map((device) => (
              <FavoriteContextMenu
                key={device.id}
                favorite={false}
                onAdd={() => toggle(device.id)}
                onRemove={() => remove(device.id)}
              >
                <DeviceCard
                  device={device}
                  dragging={draggingId === device.id}
                  dragProps={cardProps(device.id)}
                />
              </FavoriteContextMenu>
            ))}
          </div>
        </section>
      )}

      <OtherDevicesSection devices={unsupported} />
    </div>
  );
}

/** ドロップ位置の目印。 */
function DropLine() {
  return (
    <div
      aria-hidden
      className="mb-2.5 h-0.5 rounded-full bg-sd-accent shadow-[0_0_8px_var(--sd-accent)]"
    />
  );
}
