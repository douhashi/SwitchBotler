import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { DeviceCard } from "@/components/device/device-card";
import { DeviceDetail } from "@/components/device/device-detail";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useNavigationStore } from "@/stores/navigation-store";

export function DevicesView() {
  const devices = useDeviceStore((s) => s.devices);
  const loading = useDeviceStore((s) => s.loading);
  const load = useDeviceStore((s) => s.load);
  const refresh = useDeviceStore((s) => s.refresh);
  const selectedDeviceId = useNavigationStore((s) => s.selectedDeviceId);

  useEffect(() => {
    load();
  }, [load]);

  const selected = devices.find((d) => d.id === selectedDeviceId);
  if (selected) return <DeviceDetail device={selected} />;

  return (
    <div>
      <ViewHeader
        title="デバイス"
        subtitle="リビング・寝室ほか"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && "animate-spin")} strokeWidth={2} />
            更新
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}
