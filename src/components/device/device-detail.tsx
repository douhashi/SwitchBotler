import { ViewHeader } from "@/components/view-header";
import { deviceCapabilities, type Device } from "@/data";
import { useNavigationStore } from "@/stores/navigation-store";
import { DETAIL_WIDGETS } from "./detail/registry";
import { PowerToggle } from "./detail/widgets/power-toggle";

/**
 * 個別デバイスの詳細操作。
 *
 * capability 駆動: `deviceCapabilities(device)` が返す操作リストを widget レジストリで描画する。
 * category による分岐はここには無い（種別固有の知識は `deviceCapabilities` の 1 箇所に集約）。
 * power capability は常にヘッダ（`ViewHeader` actions）へ、それ以外は本文へ順に並べる。
 */
export function DeviceDetail({ device }: { device: Device }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const capabilities = deviceCapabilities(device);
  const hasPower = capabilities.some((c) => c.kind === "power");
  const bodyCapabilities = capabilities.filter((c) => c.kind !== "power");

  return (
    <div>
      <ViewHeader
        title={device.name}
        subtitle={device.model}
        onBack={() => navigate("devices")}
        actions={hasPower ? <PowerToggle device={device} /> : undefined}
      />
      {bodyCapabilities.map((capability) => {
        const Widget = DETAIL_WIDGETS[capability.kind];
        return <Widget key={capability.kind} device={device} />;
      })}
    </div>
  );
}
