import { Activity, Layers, LayoutGrid, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";

import type { ViewId } from "@/stores/navigation-store";
import { DevicesView } from "./devices-view";
import { ScenesView } from "./scenes-view";
import { SensorsView } from "./sensors-view";
import { SettingsView } from "./settings-view";

/**
 * 画面メタ情報の SSoT。サイドバーのナビ（label / icon）と画面本体（render）が
 * 同じ定義を参照する。各画面のタイトル・サブタイトルは各 view の ViewHeader が持つ。
 */
export type ViewMeta = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  render: () => ReactElement;
};

export const VIEWS: ViewMeta[] = [
  {
    id: "devices",
    label: "デバイス",
    icon: LayoutGrid,
    render: () => <DevicesView />,
  },
  {
    id: "sensors",
    label: "センサー",
    icon: Activity,
    render: () => <SensorsView />,
  },
  {
    id: "scenes",
    label: "シーン",
    icon: Layers,
    render: () => <ScenesView />,
  },
  {
    id: "settings",
    label: "設定",
    icon: Settings,
    render: () => <SettingsView />,
  },
];

const VIEW_MAP = new Map<ViewId, ViewMeta>(VIEWS.map((v) => [v.id, v]));

export function getView(id: ViewId): ViewMeta {
  const view = VIEW_MAP.get(id);
  if (!view) throw new Error(`Unknown view: ${id}`);
  return view;
}
