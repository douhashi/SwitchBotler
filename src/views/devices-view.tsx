import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { DeviceCard } from "@/components/device/device-card";
import { DeviceDetail } from "@/components/device/device-detail";
import { OtherDevicesSection } from "@/components/device/other-devices-section";
import { FavoritesBoard } from "@/components/favorites/favorites-board";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { isOtherDevice } from "@/data";
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

  useEffect(() => {
    load();
    loadFavorites();
  }, [load, loadFavorites]);

  const selected = devices.find((d) => d.id === selectedDeviceId);
  if (selected) return <DeviceDetail device={selected} />;

  // 操作もセンサー読み取りもできない「未対応」は末尾の折りたたみへ。
  const unsupported = devices.filter(isOtherDevice);
  const operable = devices.filter((d) => !isOtherDevice(d));

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

      <FavoritesBoard
        items={operable}
        favoritesTitle={t("favorites")}
        restTitle={t("all")}
        favoriteIds={favoriteIds}
        place={place}
        remove={remove}
        toggle={toggle}
        move={move}
        renderRow={(device, props) => <DeviceCard device={device} {...props} />}
      />

      <OtherDevicesSection devices={unsupported} />
    </div>
  );
}
