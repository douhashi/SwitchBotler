import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { DeviceCard } from "@/components/device/device-card";
import { DeviceDetail } from "@/components/device/device-detail";
import { OtherDevicesSection } from "@/components/device/other-devices-section";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/view-state";
import { isOtherDevice } from "@/data";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useNavigationStore } from "@/stores/navigation-store";

export function DevicesView() {
  const devices = useDeviceStore((s) => s.devices);
  const loading = useDeviceStore((s) => s.loading);
  const loaded = useDeviceStore((s) => s.loaded);
  const error = useDeviceStore((s) => s.error);
  const load = useDeviceStore((s) => s.load);
  const refresh = useDeviceStore((s) => s.refresh);
  const selectedDeviceId = useNavigationStore((s) => s.selectedDeviceId);
  const favoriteIds = useFavoritesStore((s) => s.deviceIds);
  const loadFavorites = useFavoritesStore((s) => s.load);

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
  const favorites = operable.filter((d) => favoriteIds.has(d.id));

  return (
    <div>
      <ViewHeader
        title="デバイス"
        subtitle="SwitchBot アカウントのデバイス"
        actions={
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} strokeWidth={2} />
            更新
          </Button>
        }
      />
      {loading && devices.length === 0 && <LoadingState />}
      {error && devices.length === 0 && (
        <ErrorState message={error} onRetry={refresh} />
      )}
      {loaded && !error && devices.length === 0 && (
        <EmptyState>デバイスが見つかりませんでした。</EmptyState>
      )}

      {favorites.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 px-0.5 text-xs font-semibold text-muted-foreground">
            お気に入り
          </h2>
          <div className="grid-cards">
            {favorites.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        </section>
      )}

      {operable.length > 0 && (
        <section>
          {favorites.length > 0 && (
            <h2 className="mb-2 px-0.5 text-xs font-semibold text-muted-foreground">
              すべて
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
